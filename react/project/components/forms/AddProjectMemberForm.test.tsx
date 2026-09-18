import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import AddProjectMemberForm from './AddProjectMemberForm'

jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}))
jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return {
    __esModule: true,
    default: {
      ...actual.default,
      get: jest.fn(),
      patch: jest.fn(),
    },
  }
})

const mockUseSnackbar = useSnackbar as jest.Mock
const mockGet = axios.get as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockSetProject = jest.fn()

const project = {
  id: 'project-1',
  leader: {id: 'leader-1'},
  members: [],
  admins: [],
}

const renderForm = () =>
  render(
    <ProjectContext.Provider value={{project: project as any, setProject: mockSetProject}}>
      <AddProjectMemberForm />
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockGet.mockResolvedValue({
    data: {
      members: [
        {id: 'leader-1', email: 'leader@example.com'},
        {id: 'candidate-1', email: 'candidate@example.com'},
      ],
    },
  })
})

afterEach(() => {
  mockGet.mockReset()
  mockPatch.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetProject.mockReset()
})

// MemberStub's title/subheader text sits inside an MUI Skeleton
// (`withChildren`), which renders it `visibility: hidden` by design — it's
// only there to size the placeholder. The click handler lives on the
// enclosing Card, so tests click that element directly (found via its
// stable MUI class name) instead of the invisible text.
const clickMemberStub = async () => {
  const card = await waitFor(() => {
    const el = document.querySelector('.MuiCard-root')
    if (!el) throw new Error('MemberStub Card not found')
    return el
  })
  await userEvent.click(card)
}

describe('AddProjectMemberForm', () => {
  it('shows the stub until clicked, then reveals the member picker', async () => {
    renderForm()

    expect(screen.queryByLabelText(/add member/i)).not.toBeInTheDocument()

    await clickMemberStub()

    expect(screen.getByLabelText(/add member/i)).toBeInTheDocument()
  })

  it('excludes the project leader from the candidate list', async () => {
    renderForm()
    await clickMemberStub()

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/members'))
    await userEvent.click(screen.getByLabelText(/add member/i))

    expect(screen.getByText('candidate@example.com')).toBeInTheDocument()
    expect(screen.queryByText('leader@example.com')).not.toBeInTheDocument()
  })

  it('adds the selected member and updates the project on success', async () => {
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {project: {...project, members: [{id: 'candidate-1'}]}},
    })

    renderForm()
    await clickMemberStub()
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/members'))

    const input = screen.getByLabelText(/add member/i)
    await userEvent.click(input)
    await userEvent.click(await screen.findByText('candidate@example.com'))
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/projects/project-1', {addMember: 'candidate-1'})
    )
    expect(mockSetProject).toHaveBeenCalledWith({...project, members: [{id: 'candidate-1'}]})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Project Member Added Updated',
      {variant: 'success'}
    )
  })
})
