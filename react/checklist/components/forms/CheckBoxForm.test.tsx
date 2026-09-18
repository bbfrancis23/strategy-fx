import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import axios from 'axios'
import {SectionContext} from '@/react/section'
import {ProjectContext} from '@/react/project'
import {ItemContext} from '@/react/item'
import {BoardContext} from '@/react/board'
import CheckBoxForm from './CheckBoxForm'

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

const renderCheckBoxForm = () =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <BoardContext.Provider
        value={{board: {id: 'board-1', title: 'Board', columns: []} as any, setBoard: mockSetBoard}}
      >
        <ItemContext.Provider
          value={{item: {id: 'item-1', title: 'Item'} as any, setItem: mockSetItem}}
        >
          <SectionContext.Provider
            value={{section: {id: 'section-1', content: 'Checklist'} as any, setSection: jest.fn()}}
          >
            <CheckBoxForm />
          </SectionContext.Provider>
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

describe('CheckBoxForm', () => {
  it('shows the "Add Checkbox" button until clicked, then reveals the form', async () => {
    renderCheckBoxForm()

    expect(screen.queryByLabelText(/checkbox label/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', {name: /add checkbox/i}))

    expect(screen.getByLabelText(/checkbox label/i)).toBeInTheDocument()
  })

  it('submits the new checkbox label to the section endpoint', async () => {
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Created,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderCheckBoxForm()
    await userEvent.click(screen.getByRole('button', {name: /add checkbox/i}))
    await userEvent.type(screen.getByLabelText(/checkbox label/i), 'Buy milk')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections/section-1',
        {label: 'Buy milk', sectiontype: '6563a7fdbf30bb677e252c56'}
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item Checklist Updated', {variant: 'success'})
    await waitFor(() => expect(mockSetBoard).toHaveBeenCalled())
  })
})
