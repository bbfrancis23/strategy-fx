import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSession} from 'next-auth/react'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {BoardContext} from '@/react/board'
import {MemberContext} from '@/react/members'
import {FxThemeContext, defaultFxTheme} from '@/fx/theme'
import {ColumnForm} from './ColumnForm'

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
const mockSetBoard = jest.fn()

const column = {id: 'column-1', title: 'Original Column', items: []}

const renderColumnForm = (memberId = 'admin-1') =>
  render(
    <FxThemeContext.Provider value={{fxTheme: defaultFxTheme, setFxTheme: jest.fn()}}>
      <ProjectContext.Provider
        value={{
          project: {id: 'project-1', leader: {id: 'leader-1'}, admins: [{id: 'admin-1'}]} as any,
          setProject: jest.fn(),
        }}
      >
        <BoardContext.Provider
          value={{
            board: {id: 'board-1', title: 'Board', columns: []} as any,
            setBoard: mockSetBoard,
          }}
        >
          <MemberContext.Provider value={{member: {id: memberId} as any, setMember: jest.fn()}}>
            <ColumnForm column={column as any} />
          </MemberContext.Provider>
        </BoardContext.Provider>
      </ProjectContext.Provider>
    </FxThemeContext.Provider>
  )

beforeEach(() => {
  mockUseSession.mockReturnValue({data: {user: {id: 'admin-1'}}, status: 'authenticated'})
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPatch.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetBoard.mockReset()
})

describe('ColumnForm', () => {
  it('shows the title as read-only text for a non-admin member', () => {
    renderColumnForm('someone-else')

    expect(screen.getByText('Original Column')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^column$/i)).not.toBeInTheDocument()
  })

  it('reveals the edit field for a project admin', async () => {
    renderColumnForm('admin-1')

    await userEvent.click(screen.getByText('Original Column'))

    expect(screen.getByLabelText(/^column$/i)).toBeInTheDocument()
  })

  it('submits the new title and updates the board on success', async () => {
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {board: {id: 'board-1', title: 'Board', columns: []}},
    })

    renderColumnForm('admin-1')
    await userEvent.click(screen.getByText('Original Column'))
    const field = screen.getByLabelText(/^column$/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'New Column Title')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/members/projects/project-1/boards/board-1/columns/column-1',
        {title: 'New Column Title'}
      )
    )
    expect(mockSetBoard).toHaveBeenCalledWith({id: 'board-1', title: 'Board', columns: []})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Column updated', {variant: 'success'})
  })
})
