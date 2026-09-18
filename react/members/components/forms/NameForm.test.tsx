import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import NameForm from './NameForm'

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

describe('NameForm', () => {
  it('shows an "Add Member Name" button when there is no name yet', () => {
    render(<NameForm name="" onUpdateMember={jest.fn()} />)

    expect(screen.getByRole('button', {name: /add member name/i})).toBeInTheDocument()
  })

  it('shows the current name as read-only text until clicked', async () => {
    render(<NameForm name="Original Name" onUpdateMember={jest.fn()} />)

    expect(screen.getByText('Original Name')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Original Name'))

    expect(screen.getByLabelText(/member name/i)).toBeInTheDocument()
  })

  it('submits the new name and calls onUpdateMember on success', async () => {
    const onUpdateMember = jest.fn()
    mockPatch.mockResolvedValue({status: 200})

    render(<NameForm name="Old Name" onUpdateMember={onUpdateMember} />)
    await userEvent.click(screen.getByText('Old Name'))
    const field = screen.getByLabelText(/member name/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'New Name')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/auth/member', {memberName: 'New Name'})
    )
    expect(onUpdateMember).toHaveBeenCalled()
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Member Name Updated. Authentication Required',
      {variant: 'success'}
    )
    expect(screen.getByText('New Name')).toBeInTheDocument()
  })
})
