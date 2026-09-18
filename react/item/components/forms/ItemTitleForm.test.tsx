import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {ProjectContext} from '@/react/project'
import {BoardContext} from '@/react/board'
import {ItemContext} from '@/react/item/ItemContext'
import ItemTitleForm from './ItemTitleForm'

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
      get: jest.fn(),
    },
  }
})

const mockUseSnackbar = useSnackbar as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockGet = axios.get as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockSetItem = jest.fn()
const mockSetBoard = jest.fn()

const renderItemTitleForm = (closeForm = jest.fn()) =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <BoardContext.Provider
        value={{board: {id: 'board-1', title: 'Board', columns: []} as any, setBoard: mockSetBoard}}
      >
        <ItemContext.Provider
          value={{item: {id: 'item-1', title: 'Original Title'} as any, setItem: mockSetItem}}
        >
          <ItemTitleForm closeForm={closeForm} />
        </ItemContext.Provider>
      </BoardContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockGet.mockResolvedValue({
    status: axios.HttpStatusCode.Ok,
    data: {board: {id: 'board-1', title: 'Board', columns: []}},
  })
})

afterEach(() => {
  mockPatch.mockReset()
  mockGet.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetItem.mockReset()
  mockSetBoard.mockReset()
})

describe('ItemTitleForm', () => {
  it('pre-fills the field with the current item title', () => {
    renderItemTitleForm()

    expect(screen.getByLabelText(/card title/i)).toHaveValue('Original Title')
  })

  it('submits the new title, refreshes the item and board, and closes the form', async () => {
    const closeForm = jest.fn()
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'New Title'}},
    })

    renderItemTitleForm(closeForm)

    await userEvent.clear(screen.getByLabelText(/card title/i))
    await userEvent.type(screen.getByLabelText(/card title/i), 'New Title')
    await userEvent.click(screen.getByTestId('DoneIcon'))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/api/members/projects/project-1/items/item-1', {
        title: 'New Title',
      })
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'New Title'})
    await waitFor(() =>
      expect(mockSetBoard).toHaveBeenCalledWith({id: 'board-1', title: 'Board', columns: []})
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item title updated', {variant: 'success'})
    expect(closeForm).toHaveBeenCalled()
  })

  it('shows an error snackbar and keeps the form open when the request fails', async () => {
    const closeForm = jest.fn()
    mockPatch.mockRejectedValue(new Error('Network Error'))

    renderItemTitleForm(closeForm)

    await userEvent.clear(screen.getByLabelText(/card title/i))
    await userEvent.type(screen.getByLabelText(/card title/i), 'New Title')
    await userEvent.click(screen.getByTestId('DoneIcon'))

    await waitFor(() =>
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Network Error', {variant: 'error'})
    )
    expect(closeForm).not.toHaveBeenCalled()
  })

  it('closes the form without saving when the close icon is clicked', async () => {
    const closeForm = jest.fn()
    renderItemTitleForm(closeForm)

    await userEvent.click(screen.getByTestId('CloseIcon'))

    expect(closeForm).toHaveBeenCalled()
    expect(mockPatch).not.toHaveBeenCalled()
  })
})
