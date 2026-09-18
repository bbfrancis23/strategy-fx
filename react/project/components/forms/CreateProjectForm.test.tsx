import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import CreateProjectForm from './CreateProjectForm'

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

beforeEach(() => {
  mockUseSession.mockReturnValue({data: {user: {id: 'member-1'}}, status: 'authenticated'})
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
})

describe('CreateProjectForm', () => {
  it('renders nothing while there is no session', () => {
    mockUseSession.mockReturnValue({data: null, status: 'unauthenticated'})

    render(<CreateProjectForm setProjects={jest.fn()} closeForm={jest.fn()} />)

    expect(screen.queryByLabelText(/new project/i)).not.toBeInTheDocument()
  })

  it('disables save until a title is entered', async () => {
    render(<CreateProjectForm setProjects={jest.fn()} closeForm={jest.fn()} />)

    const saveButton = screen.getByRole('button', {name: /save/i})
    expect(saveButton).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/new project/i), 'My Project')

    await waitFor(() => expect(saveButton).toBeEnabled())
  })

  it('submits the title, updates projects, and closes the form on success', async () => {
    const setProjects = jest.fn()
    const closeForm = jest.fn()
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Created,
      data: {projects: [{id: '1', title: 'My Project'}]},
    })

    render(<CreateProjectForm setProjects={setProjects} closeForm={closeForm} />)

    await userEvent.type(screen.getByLabelText(/new project/i), 'My Project')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/projects', {title: 'My Project'})
    )
    expect(setProjects).toHaveBeenCalledWith([{id: '1', title: 'My Project'}])
    expect(closeForm).toHaveBeenCalled()
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Project created', {variant: 'success'})
  })

  it('shows an error snackbar and keeps the form open when the request fails', async () => {
    const closeForm = jest.fn()
    mockPost.mockRejectedValue({response: {data: {message: 'Title already exists'}}})

    render(<CreateProjectForm setProjects={jest.fn()} closeForm={closeForm} />)

    await userEvent.type(screen.getByLabelText(/new project/i), 'My Project')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Title already exists', {variant: 'error'})
    )
    expect(closeForm).not.toHaveBeenCalled()
  })
})
