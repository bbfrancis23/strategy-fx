import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import CreateBoardForm from './CreateBoardForm'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
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

const renderCreateBoardForm = (setBoards = jest.fn(), closeForm = jest.fn()) =>
  render(
    <ProjectContext.Provider
      value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}
    >
      <CreateBoardForm setBoards={setBoards} closeForm={closeForm} />
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSession.mockReturnValue({data: {user: {id: 'member-1'}}, status: 'authenticated'})
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
})

describe('CreateBoardForm', () => {
  it('renders nothing while there is no session', () => {
    mockUseSession.mockReturnValue({data: null, status: 'unauthenticated'})

    renderCreateBoardForm()

    expect(screen.queryByLabelText(/new board/i)).not.toBeInTheDocument()
  })

  it('submits the title scoped to the current project and updates boards on success', async () => {
    const setBoards = jest.fn()
    const closeForm = jest.fn()
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Created,
      data: {boards: [{id: '1', title: 'New Board'}]},
    })

    renderCreateBoardForm(setBoards, closeForm)

    await userEvent.type(screen.getByLabelText(/new board/i), 'New Board')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/projects/project-1/boards', {title: 'New Board'})
    )
    expect(setBoards).toHaveBeenCalledWith([{id: '1', title: 'New Board'}])
    expect(closeForm).toHaveBeenCalled()
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Board created', {variant: 'success'})
  })

  it('shows an error snackbar when the request fails', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'))

    renderCreateBoardForm()

    await userEvent.type(screen.getByLabelText(/new board/i), 'New Board')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Network Error', {variant: 'error'})
    )
  })
})
