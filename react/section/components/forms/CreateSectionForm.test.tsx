import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ItemContext} from '@/react/item'
import {MemberContext} from '@/react/members'
import {ProjectContext} from '@/react/project'
import CreateSectionForm from './CreateSectionForm'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}))
jest.mock('@uiw/react-textarea-code-editor', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <textarea {...props} />,
}))
jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return {
    __esModule: true,
    default: {
      ...actual.default,
      post: jest.fn(),
    },
  }
})

const mockUseSession = useSession as jest.Mock
const mockUseSnackbar = useSnackbar as jest.Mock
const mockPost = axios.post as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockSetItem = jest.fn()

const renderForm = (ownerId = 'owner-1') =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <MemberContext.Provider value={{member: {id: ownerId} as any, setMember: jest.fn()}}>
        <ItemContext.Provider
          value={{
            item: {id: 'item-1', title: 'Item', owners: ['owner-1']} as any,
            setItem: mockSetItem,
          }}
        >
          <CreateSectionForm />
        </ItemContext.Provider>
      </MemberContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockUseSession.mockReturnValue({data: {user: {id: 'owner-1'}}, status: 'authenticated'})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetItem.mockReset()
})

describe('CreateSectionForm', () => {
  it('shows the stub until clicked, then reveals the form, defaulting to text', async () => {
    renderForm()

    expect(screen.queryByLabelText(/create section/i)).not.toBeInTheDocument()

    await userEvent.click(await screen.findByText(/create section/i))

    expect(screen.getByLabelText(/create section/i)).toBeInTheDocument()
  })

  it('submits a text section to the item-scoped endpoint', async () => {
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm()
    await userEvent.click(await screen.findByText(/create section/i))
    await userEvent.type(screen.getByLabelText(/create section/i), 'A text section')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections',
        {content: 'A text section', sectiontype: '63b2503c49220f42d9fc17d9'}
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Section Created', {variant: 'success'})
  })

  it('submits a code section when the code type is selected', async () => {
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm()
    await userEvent.click(await screen.findByText(/create section/i))

    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[1])

    await userEvent.type(screen.getByPlaceholderText(/create code/i), 'const x = 1')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections',
        {content: 'const x = 1', sectiontype: '63b88d18379a4f30bab59bad'}
      )
    )
  })
})
