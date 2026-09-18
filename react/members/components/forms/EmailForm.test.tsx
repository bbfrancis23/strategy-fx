import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import EmailForm from './EmailForm'

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

const mockUseSnackbar = useSnackbar as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockEnqueueSnackbar = jest.fn()

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPatch.mockReset()
  mockEnqueueSnackbar.mockReset()
})

describe('EmailForm', () => {
  it('shows the current email as read-only text until clicked', async () => {
    render(<EmailForm email="member@example.com" onUpdateMember={jest.fn()} />)

    expect(screen.getByText('member@example.com')).toBeInTheDocument()

    await userEvent.click(screen.getByText('member@example.com'))

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
  })

  it('submits the new email and calls onUpdateMember on success', async () => {
    const onUpdateMember = jest.fn()
    mockPatch.mockResolvedValue({status: 200})

    render(<EmailForm email="old@example.com" onUpdateMember={onUpdateMember} />)
    await userEvent.click(screen.getByText('old@example.com'))
    const field = screen.getByLabelText(/^email$/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'new@example.com')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/auth/member', {email: 'new@example.com'})
    )
    expect(onUpdateMember).toHaveBeenCalled()
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Email Updated. Revalidate required',
      {variant: 'success'}
    )
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
  })
})
