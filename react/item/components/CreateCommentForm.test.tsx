import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ItemContext} from '@/react/item'
import {BoardContext} from '@/react/board'
import CreateCommentForm from './CreateCommentForm'

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

const renderForm = () =>
  render(
    <BoardContext.Provider
      value={{
        board: {id: 'board-1', title: 'Board', columns: [], project: 'project-1'} as any,
        setBoard: jest.fn(),
      }}
    >
      <ItemContext.Provider
        value={{item: {id: 'item-1', title: 'Item'} as any, setItem: mockSetItem}}
      >
        <CreateCommentForm />
      </ItemContext.Provider>
    </BoardContext.Provider>
  )

beforeEach(() => {
  mockUseSession.mockReturnValue({data: {user: {id: 'member-1'}}, status: 'authenticated'})
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetItem.mockReset()
})

describe('CreateCommentForm', () => {
  it('shows the stub until clicked, then reveals the text comment form', async () => {
    renderForm()

    expect(screen.queryByLabelText(/create comment/i)).not.toBeInTheDocument()

    await userEvent.click(await screen.findByText(/create section/i))

    expect(screen.getByLabelText(/create comment/i)).toBeInTheDocument()
  })

  it('submits a text comment to the board project-scoped endpoint', async () => {
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm()
    await userEvent.click(await screen.findByText(/create section/i))
    await userEvent.type(screen.getByLabelText(/create comment/i), 'A comment')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    const commentsUrl = '/api/members/projects/project-1/items/item-1/comments'
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(commentsUrl, {
        content: 'A comment',
        commenttype: '63b2503c49220f42d9fc17d9',
      })
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Comment Created', {variant: 'success'})
  })

  it('switches to the code editor when the code button is selected', async () => {
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm()
    await userEvent.click(await screen.findByText(/create section/i))
    await userEvent.click(screen.getByRole('button', {name: '{}'}))

    const codeField = screen.getByPlaceholderText(/create code comment/i)
    await userEvent.type(codeField, 'const x = 1')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    const commentsUrl = '/api/members/projects/project-1/items/item-1/comments'
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(commentsUrl, {
        content: 'const x = 1',
        commenttype: '63b88d18379a4f30bab59bad',
      })
    )
  })
})
