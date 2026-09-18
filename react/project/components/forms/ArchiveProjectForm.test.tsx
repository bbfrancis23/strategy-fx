import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useConfirm} from 'material-ui-confirm'
import {useSnackbar} from 'notistack'
import {useSession} from 'next-auth/react'
import axios from 'axios'
import router from 'next/router'
import {ProjectContext} from '@/react/project'
import {MemberContext} from '@/react/members'
import ArchiveProjectForm from './ArchiveProjectForm'

jest.mock('material-ui-confirm', () => ({
  useConfirm: jest.fn(),
}))
jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}))
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('next/router', () => ({
  push: jest.fn(),
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
const mockUseConfirm = useConfirm as jest.Mock
const mockUseSnackbar = useSnackbar as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockConfirm = jest.fn()
const mockRouterPush = router.push as jest.Mock

const renderArchiveProjectForm = (leaderId = 'leader-1', memberId = 'leader-1') =>
  render(
    <ProjectContext.Provider
      value={{
        project: {id: 'project-1', title: 'My Project', leader: {id: leaderId}} as any,
        setProject: jest.fn(),
      }}
    >
      <MemberContext.Provider value={{member: {id: memberId} as any, setMember: jest.fn()}}>
        <ArchiveProjectForm />
      </MemberContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockUseConfirm.mockReturnValue(mockConfirm)
  mockUseSession.mockReturnValue({data: {user: {id: 'leader-1'}}, status: 'authenticated'})
})

afterEach(() => {
  mockPatch.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockConfirm.mockReset()
  mockRouterPush.mockReset()
})

describe('ArchiveProjectForm', () => {
  it('is not shown to a member who is not the project leader', async () => {
    renderArchiveProjectForm('leader-1', 'someone-else')

    await waitFor(() =>
      expect(screen.queryByRole('button', {name: /archive project/i})).not.toBeInTheDocument()
    )
  })

  it('archives the project and navigates away after confirmation', async () => {
    mockConfirm.mockResolvedValue(undefined)
    mockPatch.mockResolvedValue({status: axios.HttpStatusCode.Ok})

    renderArchiveProjectForm('leader-1', 'leader-1')

    const archiveButton = await screen.findByRole('button', {name: /archive project/i})
    await userEvent.click(archiveButton)

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/projects/project-1', {archive: true})
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Archived My Project', {variant: 'success'})
    expect(mockRouterPush).toHaveBeenCalledWith('/member')
  })

  it('does not archive the project when the confirmation is declined', async () => {
    mockConfirm.mockRejectedValue(new Error('cancelled'))

    renderArchiveProjectForm('leader-1', 'leader-1')

    const archiveButton = await screen.findByRole('button', {name: /archive project/i})
    await userEvent.click(archiveButton)

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Archiving aborted', {variant: 'error'})
    )
    expect(mockPatch).not.toHaveBeenCalled()
  })
})
