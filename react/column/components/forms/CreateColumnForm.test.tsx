import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {BoardContext} from '@/react/board'
import {FxThemeContext, defaultFxTheme} from '@/fx/theme'
import {CreateColumnForm} from './CreateColumnForm'

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
const mockSetBoard = jest.fn()

const renderCreateColumnForm = () =>
  render(
    <FxThemeContext.Provider value={{fxTheme: defaultFxTheme, setFxTheme: jest.fn()}}>
      <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
        <BoardContext.Provider
          value={{
            board: {id: 'board-1', title: 'Board', columns: []} as any,
            setBoard: mockSetBoard,
          }}
        >
          <CreateColumnForm />
        </BoardContext.Provider>
      </ProjectContext.Provider>
    </FxThemeContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetBoard.mockReset()
})

describe('CreateColumnForm', () => {
  it('shows a stub button until clicked, then reveals the form', async () => {
    renderCreateColumnForm()

    expect(screen.queryByLabelText(/new column/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByLabelText(/new column/i)).toBeInTheDocument()
  })

  it('submits the title to the project/board-scoped endpoint', async () => {
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Created,
      data: {board: {id: 'board-1', title: 'Board', columns: []}},
    })

    renderCreateColumnForm()
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByLabelText(/new column/i), 'New Column')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/members/projects/project-1/boards/board-1/columns',
        {title: 'New Column'}
      )
    )
    expect(mockSetBoard).toHaveBeenCalledWith({id: 'board-1', title: 'Board', columns: []})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Column created', {variant: 'success'})
    expect(screen.queryByLabelText(/new column/i)).not.toBeInTheDocument()
  })

  it('shows an error snackbar and keeps the form open when the request fails', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'))

    renderCreateColumnForm()
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByLabelText(/new column/i), 'New Column')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Network Error', {variant: 'error'})
    )
    expect(screen.getByLabelText(/new column/i)).toBeInTheDocument()
  })
})
