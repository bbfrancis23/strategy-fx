import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useConfirm} from 'material-ui-confirm'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import router from 'next/router'
import {useSession} from 'next-auth/react'
import {ProjectContext} from '@/react/project'
import {MemberContext} from '@/react/members'
import {ItemContext} from '@/react/item/ItemContext'
import ArchiveItemForm from './ArchiveItemForm'

jest.mock('material-ui-confirm', () => ({
  useConfirm: jest.fn(),
}))
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
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
      delete: jest.fn(),
    },
  }
})

const mockUseSession = useSession as jest.Mock
const mockUseConfirm = useConfirm as jest.Mock
const mockUseSnackbar = useSnackbar as jest.Mock
const mockDelete = axios.delete as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockConfirm = jest.fn()
const mockRouterPush = router.push as jest.Mock

const renderArchiveItemForm = (leaderId = 'leader-1', memberId = 'leader-1') =>
  render(
    <ProjectContext.Provider
      value={{project: {id: 'project-1', leader: {id: leaderId}} as any, setProject: jest.fn()}}
    >
      <MemberContext.Provider value={{member: {id: memberId} as any, setMember: jest.fn()}}>
        <ItemContext.Provider
          value={{item: {id: 'item-1', title: 'My Item'} as any, setItem: jest.fn()}}
        >
          <ArchiveItemForm />
        </ItemContext.Provider>
      </MemberContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockUseConfirm.mockReturnValue(mockConfirm)
  mockUseSession.mockReturnValue({data: {user: {id: 'leader-1'}}, status: 'authenticated'})
})

afterEach(() => {
  mockDelete.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockConfirm.mockReset()
  mockRouterPush.mockReset()
})

describe('ArchiveItemForm', () => {
  it('is not shown to a member who is not the project leader', async () => {
    renderArchiveItemForm('leader-1', 'someone-else')

    await waitFor(() =>
      expect(screen.queryByRole('button', {name: /archive item/i})).not.toBeInTheDocument()
    )
  })

  it('archives the item and navigates away after confirmation', async () => {
    mockConfirm.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue({status: axios.HttpStatusCode.Ok})

    renderArchiveItemForm('leader-1', 'leader-1')

    const archiveButton = await screen.findByRole('button', {name: /archive item/i})
    await userEvent.click(archiveButton)

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/api/members/projects/project-1/items/item-1')
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Archived My Item', {variant: 'success'})
    expect(mockRouterPush).toHaveBeenCalledWith('/member')
  })

  it('does not delete the item when the confirmation is declined', async () => {
    mockConfirm.mockRejectedValue(new Error('cancelled'))

    renderArchiveItemForm('leader-1', 'leader-1')

    const archiveButton = await screen.findByRole('button', {name: /archive item/i})
    await userEvent.click(archiveButton)

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Archiving aborted', {variant: 'error'})
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
