import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {signIn} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import {AppContext, AppDialogs, DialogActions} from '@/react/app'
import AuthForm from './AuthForm'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))
jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}))

const mockSignIn = signIn as jest.Mock
const mockUseSnackbar = useSnackbar as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockDialogActions = jest.fn()

const renderAuthForm = () =>
  render(
    <AppContext.Provider
      value={{
        app: {
          settingsDialogIsOpen: false,
          authDialogIsOpen: true,
          regDialogIsOpen: false,
          forgotDialogIsOpen: false,
        },
        dialogActions: mockDialogActions,
      }}
    >
      <AuthForm />
    </AppContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockSignIn.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockDialogActions.mockReset()
})

describe('AuthForm', () => {
  it('logs in and closes the dialog on success', async () => {
    mockSignIn.mockResolvedValue({status: 200, error: null})

    renderAuthForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'member@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.click(screen.getByRole('button', {name: /login/i}))

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'member@example.com',
        password: 'password123',
      })
    )
    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Close,
      dialog: AppDialogs.Auth,
    })
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('You are now Logged In', {variant: 'success'})
  })

  it('shows an inline error for invalid credentials', async () => {
    mockSignIn.mockResolvedValue({
      status: 401,
      error: JSON.stringify({errors: 'Ivalid Credentials', status: 401}),
    })

    renderAuthForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'member@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrong-password')
    await userEvent.click(screen.getByRole('button', {name: /login/i}))

    await waitFor(() => expect(screen.getByText('Invalid Credentials')).toBeInTheDocument())
    expect(mockDialogActions).not.toHaveBeenCalled()
  })

  it('closes the dialog and shows a snackbar for a locked account', async () => {
    mockSignIn.mockResolvedValue({
      status: 423,
      error: JSON.stringify({errors: 'Account is Locked', status: 423}),
    })

    renderAuthForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'locked@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.click(screen.getByRole('button', {name: /login/i}))

    await waitFor(() =>
      expect(mockDialogActions).toHaveBeenCalledWith({
        type: DialogActions.Close,
        dialog: AppDialogs.Auth,
      })
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Your account is locked. Please contact support',
      {variant: 'error'}
    )
  })

  it('switches to the register dialog when "Register New Member" is clicked', async () => {
    renderAuthForm()

    await userEvent.click(screen.getByRole('button', {name: /register new member/i}))

    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Close,
      dialog: AppDialogs.Auth,
    })
    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Open,
      dialog: AppDialogs.Reg,
    })
  })

  it('opens the forgot-password dialog when "Forgot Password" is clicked', async () => {
    renderAuthForm()

    await userEvent.click(screen.getByRole('button', {name: /forgot password/i}))

    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Open,
      dialog: AppDialogs.Forgot,
    })
  })
})
