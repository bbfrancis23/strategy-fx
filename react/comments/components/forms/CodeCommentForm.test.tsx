import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import {useConfirm} from 'material-ui-confirm'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {ItemContext} from '@/react/item'
import {CodeCommentForm} from './CodeCommentForm'

jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}))
// FxCodeEditor loads @uiw/react-textarea-code-editor via next/dynamic
// ({ssr: false}), which never resolves under jsdom (the real editor relies
// on browser APIs jsdom doesn't provide) — mocking the package directly
// with a plain textarea keeps the form's own submit/delete logic testable
// without depending on that third-party editor rendering for real.
jest.mock('@uiw/react-textarea-code-editor', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <textarea {...props} />,
}))
jest.mock('material-ui-confirm', () => ({
  useConfirm: jest.fn(),
}))
jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return {
    __esModule: true,
    default: {
      ...actual.default,
      patch: jest.fn(),
      delete: jest.fn(),
    },
  }
})

const mockUseSnackbar = useSnackbar as jest.Mock
const mockUseConfirm = useConfirm as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockDelete = axios.delete as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockSetItem = jest.fn()
const mockConfirm = jest.fn()

const comment = {
  id: 'comment-1',
  content: 'const x = 1',
  sectiontype: 'code',
  itemid: 'item-1',
  owner: {id: 'owner-1', name: 'Owner'},
}

const renderForm = (closeForm = jest.fn()) =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <ItemContext.Provider
        value={{item: {id: 'item-1', title: 'Item'} as any, setItem: mockSetItem}}
      >
        <CodeCommentForm comment={comment as any} closeForm={closeForm} />
      </ItemContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockUseConfirm.mockReturnValue(mockConfirm)
})

afterEach(() => {
  mockPatch.mockReset()
  mockDelete.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetItem.mockReset()
  mockConfirm.mockReset()
})

describe('CodeCommentForm', () => {
  it('pre-fills the code editor with the current comment content', async () => {
    renderForm()

    // FxCodeEditor loads via next/dynamic({ssr: false}), so it isn't
    // present on the first synchronous render.
    expect(await screen.findByPlaceholderText(/create code comment/i)).toHaveValue('const x = 1')
  })

  it('submits the updated code and closes the form on success', async () => {
    const closeForm = jest.fn()
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm(closeForm)
    const field = await screen.findByPlaceholderText(/create code comment/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'const y = 2')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/comments/comment-1',
        {content: 'const y = 2', sectiontype: '63b88d18379a4f30bab59bad'}
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item Section Updated', {variant: 'success'})
    expect(closeForm).toHaveBeenCalled()
  })

  it('deletes the comment after confirmation', async () => {
    mockConfirm.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue({data: {item: {id: 'item-1', title: 'Item'}}})

    renderForm()
    await userEvent.click(screen.getByRole('button', {name: /^delete$/i}))

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/comments/comment-1'
      )
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item Section Deleted', {variant: 'success'})
  })
})
