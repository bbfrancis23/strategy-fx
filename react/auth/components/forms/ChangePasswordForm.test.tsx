import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import ChangePasswordForm from './ChangePasswordForm'

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

beforeEach(() => {
  mockUseSession.mockReturnValue({data: {user: {id: 'member-1'}}, status: 'authenticated'})
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPatch.mockReset()
  mockEnqueueSnackbar.mockReset()
})

describe('ChangePasswordForm', () => {
  it('renders nothing while there is no session', () => {
    mockUseSession.mockReturnValue({data: null, status: 'unauthenticated'})

    render(<ChangePasswordForm endChangePassword={jest.fn()} />)

    expect(screen.queryByLabelText(/old password/i)).not.toBeInTheDocument()
  })

  it('submits old and new passwords and ends the flow on success', async () => {
    const endChangePassword = jest.fn()
    mockPatch.mockResolvedValue({status: axios.HttpStatusCode.Ok})

    render(<ChangePasswordForm endChangePassword={endChangePassword} />)

    await userEvent.type(screen.getByLabelText(/old password/i), 'old-password')
    await userEvent.type(screen.getByLabelText(/new password/i), 'new-password')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/auth/change-password', {
        oldPassword: 'old-password',
        newPassword: 'new-password',
      })
    )
    expect(endChangePassword).toHaveBeenCalled()
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Password changed', {variant: 'success'})
  })

  it('shows the server error and keeps the form open when the old password is wrong', async () => {
    const endChangePassword = jest.fn()
    mockPatch.mockRejectedValue({response: {data: {message: 'Invalid Credentials'}}})

    render(<ChangePasswordForm endChangePassword={endChangePassword} />)

    await userEvent.type(screen.getByLabelText(/old password/i), 'wrong-password')
    await userEvent.type(screen.getByLabelText(/new password/i), 'new-password')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => expect(screen.getByText('Invalid Credentials')).toBeInTheDocument())
    expect(endChangePassword).not.toHaveBeenCalled()
  })
})
