import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {BoardContext} from '@/react/board'
import CreateItemForm from './CreateItemForm'

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

const column = {id: 'column-1', title: 'To Do', items: []} as any

const renderCreateItemForm = () =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <BoardContext.Provider
        value={{board: {id: 'board-1', title: 'Board', columns: []} as any, setBoard: mockSetBoard}}
      >
        <CreateItemForm column={column} />
      </BoardContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
})

afterEach(() => {
  mockPost.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetBoard.mockReset()
})

describe('CreateItemForm', () => {
  it('shows a stub button until clicked, then reveals the form', async () => {
    renderCreateItemForm()

    expect(screen.queryByLabelText(/new card/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByLabelText(/new card/i)).toBeInTheDocument()
  })

  it('submits the title to the project/board/column-scoped endpoint', async () => {
    mockPost.mockResolvedValue({
      status: axios.HttpStatusCode.Created,
      data: {board: {id: 'board-1', title: 'Board', columns: []}},
    })

    renderCreateItemForm()
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByLabelText(/new card/i), 'New Item')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/members/projects/project-1/boards/board-1/columns/column-1/items',
        {title: 'New Item'}
      )
    )
    expect(mockSetBoard).toHaveBeenCalledWith({id: 'board-1', title: 'Board', columns: []})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item created', {variant: 'success'})
    // Form collapses back to the stub button after a successful save.
    expect(screen.queryByLabelText(/new card/i)).not.toBeInTheDocument()
  })

  it('shows an error snackbar and keeps the form open when the request fails', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'))

    renderCreateItemForm()
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByLabelText(/new card/i), 'New Item')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Network Error', {variant: 'error'})
    )
    expect(screen.getByLabelText(/new card/i)).toBeInTheDocument()
  })
})
