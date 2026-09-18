import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import VerifyCodeForm from './VerifyCodeForm'

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

const mockUseSnackbar = useSnackbar as jest.Mock
const mockPost = axios.post as jest.Mock
const mockEnqueueSnackbar = jest.fn()

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
})

describe('VerifyCodeForm', () => {
  it('submits the code and new password, then ends the flow on success', async () => {
    const endForgotPW = jest.fn()
    mockPost.mockResolvedValue({status: axios.HttpStatusCode.Ok})

    render(<VerifyCodeForm email="member@example.com" endForgotPW={endForgotPW} />)

    await userEvent.type(screen.getByLabelText(/verification code/i), '123456')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword')
    await userEvent.click(screen.getByRole('button', {name: /change password/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/check-code', {
        email: 'member@example.com',
        code: '123456',
        newPassword: 'newpassword',
      })
    )
    expect(endForgotPW).toHaveBeenCalled()
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Password Changed', {variant: 'success'})
  })

  it('shows the server error and keeps the form open for an incorrect code', async () => {
    const endForgotPW = jest.fn()
    mockPost.mockRejectedValue({
      response: {status: axios.HttpStatusCode.BadRequest, data: {message: 'Invalid Code'}},
    })

    render(<VerifyCodeForm email="member@example.com" endForgotPW={endForgotPW} />)

    await userEvent.type(screen.getByLabelText(/verification code/i), '000000')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword')
    await userEvent.click(screen.getByRole('button', {name: /change password/i}))

    await waitFor(() => expect(screen.getByText('Invalid Code')).toBeInTheDocument())
    expect(endForgotPW).not.toHaveBeenCalled()
  })

  it('ends the flow and shows a snackbar when the account is locked', async () => {
    const endForgotPW = jest.fn()
    mockPost.mockRejectedValue({
      response: {
        status: axios.HttpStatusCode.Locked,
        data: {message: 'Your account has been locked. Please contact support'},
      },
    })

    render(<VerifyCodeForm email="member@example.com" endForgotPW={endForgotPW} />)

    await userEvent.type(screen.getByLabelText(/verification code/i), '123456')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword')
    await userEvent.click(screen.getByRole('button', {name: /change password/i}))

    await waitFor(() => expect(endForgotPW).toHaveBeenCalled())
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Your account has been locked. Please contact support',
      {variant: 'error'}
    )
  })
})
