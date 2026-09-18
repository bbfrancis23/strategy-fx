import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {AppContext, AppDialogs, DialogActions} from '@/react/app'
import {FxThemeContext, defaultFxTheme} from '@/fx/theme'
import RegisterForm from './RegisterForm'

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
const mockDialogActions = jest.fn()

const renderRegisterForm = () =>
  render(
    <FxThemeContext.Provider value={{fxTheme: defaultFxTheme, setFxTheme: jest.fn()}}>
      <AppContext.Provider
        value={{
          app: {
            settingsDialogIsOpen: false,
            authDialogIsOpen: false,
            regDialogIsOpen: true,
            forgotDialogIsOpen: false,
          },
          dialogActions: mockDialogActions,
        }}
      >
        <RegisterForm />
      </AppContext.Provider>
    </FxThemeContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockDialogActions.mockReset()
})

describe('RegisterForm', () => {
  it('registers a new member and switches to the login dialog on success', async () => {
    mockPost.mockResolvedValue({status: axios.HttpStatusCode.Created})

    renderRegisterForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.click(screen.getByRole('button', {name: /register/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/register', {
        email: 'new@example.com',
        password: 'password123',
      })
    )
    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Close,
      dialog: AppDialogs.Reg,
    })
    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Open,
      dialog: AppDialogs.Auth,
    })
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'You are now Registered Please Login',
      {variant: 'success'}
    )
  })

  it('shows the server error when registration fails', async () => {
    mockPost.mockRejectedValue({response: {data: {message: 'Member already exists'}}})

    renderRegisterForm()

    await userEvent.type(screen.getByLabelText(/email address/i), 'existing@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.click(screen.getByRole('button', {name: /register/i}))

    await waitFor(() => expect(screen.getByText('Member already exists')).toBeInTheDocument())
  })

  it('switches to the login dialog when "Login Existing Member" is clicked', async () => {
    renderRegisterForm()

    await userEvent.click(screen.getByRole('button', {name: /login existing member/i}))

    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Close,
      dialog: AppDialogs.Reg,
    })
    expect(mockDialogActions).toHaveBeenCalledWith({
      type: DialogActions.Open,
      dialog: AppDialogs.Auth,
    })
  })
})
