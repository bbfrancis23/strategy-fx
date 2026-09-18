import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {ProjectTitleForm} from './ProjectEditTitleForm'

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
      patch: jest.fn(),
    },
  }
})

const mockUseSession = useSession as jest.Mock
const mockUseSnackbar = useSnackbar as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockEnqueueSnackbar = jest.fn()

const renderProjectTitleForm = (leaderId = 'leader-1') =>
  render(
    <ProjectContext.Provider
      value={{
        project: {id: 'project-1', title: 'Original Title', leader: {id: leaderId}} as any,
        setProject: jest.fn(),
      }}
    >
      <ProjectTitleForm />
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPatch.mockReset()
  mockEnqueueSnackbar.mockReset()
})

describe('ProjectTitleForm', () => {
  it('shows the title as read-only text by default', () => {
    mockUseSession.mockReturnValue({data: {user: {id: 'leader-1'}}, status: 'authenticated'})

    renderProjectTitleForm()

    expect(screen.getByText('Original Title')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()
  })

  it('reveals the edit field when the project leader clicks the title', async () => {
    mockUseSession.mockReturnValue({data: {user: {id: 'leader-1'}}, status: 'authenticated'})

    renderProjectTitleForm('leader-1')
    await userEvent.click(screen.getByText('Original Title'))

    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument()
  })

  it('does not reveal the edit field for a non-leader', async () => {
    mockUseSession.mockReturnValue({data: {user: {id: 'someone-else'}}, status: 'authenticated'})

    renderProjectTitleForm('leader-1')
    await userEvent.click(screen.getByText('Original Title'))

    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()
  })

  it('submits the new title and updates the displayed text on success', async () => {
    mockUseSession.mockReturnValue({data: {user: {id: 'leader-1'}}, status: 'authenticated'})
    mockPatch.mockResolvedValue({status: axios.HttpStatusCode.Ok})

    renderProjectTitleForm('leader-1')
    await userEvent.click(screen.getByText('Original Title'))

    const field = screen.getByLabelText(/^title$/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'New Title')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/projects/project-1', {title: 'New Title'})
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Project Title Updated', {variant: 'success'})
    expect(screen.getByText('New Title')).toBeInTheDocument()
  })
})
