import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import {useConfirm} from 'material-ui-confirm'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {ItemContext} from '@/react/item'
import TextCommentForm from './TextCommentForm'

jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
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
  content: 'Original comment',
  sectiontype: 'text',
  itemid: 'item-1',
  owner: {id: 'owner-1', name: 'Owner'},
}

const renderForm = (closeForm = jest.fn()) =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <ItemContext.Provider
        value={{item: {id: 'item-1', title: 'Item'} as any, setItem: mockSetItem}}
      >
        <TextCommentForm comment={comment as any} closeForm={closeForm} />
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

describe('TextCommentForm', () => {
  it('pre-fills the field with the current comment content', () => {
    renderForm()

    expect(screen.getByLabelText(/update comment/i)).toHaveValue('Original comment')
  })

  it('submits the updated comment and closes the form on success', async () => {
    const closeForm = jest.fn()
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm(closeForm)
    const field = screen.getByLabelText(/update comment/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'Updated comment')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/comments/comment-1',
        {content: 'Updated comment', sectiontype: '63b2503c49220f42d9fc17d9'}
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Comment Updated', {variant: 'success'})
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
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Comment Deleted', {variant: 'success'})
  })
})
