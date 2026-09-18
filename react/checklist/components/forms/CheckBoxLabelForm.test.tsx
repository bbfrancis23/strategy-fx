import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import {useConfirm} from 'material-ui-confirm'
import axios from 'axios'
import {SectionContext} from '@/react/section'
import {ProjectContext} from '@/react/project'
import {ItemContext} from '@/react/item'
import CheckBoxLabelForm from './CheckBoxLabelForm'

jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}))
jest.mock('material-ui-confirm', () => ({
  useConfirm: jest.fn(),
}))
jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return {
    __esModule: true,
    default: {
      ...actual.default,
      patch: jest.fn(),
      delete: jest.fn(),
    },
  }
})

const mockUseSnackbar = useSnackbar as jest.Mock
const mockUseConfirm = useConfirm as jest.Mock
const mockPatch = axios.patch as jest.Mock
const mockDelete = axios.delete as jest.Mock
const mockEnqueueSnackbar = jest.fn()
const mockSetItem = jest.fn()
const mockConfirm = jest.fn()

const checkbox = {id: 'checkbox-1', label: 'Original label', value: false}

const renderForm = () =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <ItemContext.Provider
        value={{item: {id: 'item-1', title: 'Item'} as any, setItem: mockSetItem}}
      >
        <SectionContext.Provider
          value={{section: {id: 'section-1', content: 'Checklist'} as any, setSection: jest.fn()}}
        >
          <CheckBoxLabelForm checkbox={checkbox as any} />
        </SectionContext.Provider>
      </ItemContext.Provider>
    </ProjectContext.Provider>
  )

beforeEach(() => {
  mockUseSnackbar.mockReturnValue({enqueueSnackbar: mockEnqueueSnackbar})
  mockUseConfirm.mockReturnValue(mockConfirm)
})

afterEach(() => {
  mockPatch.mockReset()
  mockDelete.mockReset()
  mockEnqueueSnackbar.mockReset()
  mockSetItem.mockReset()
  mockConfirm.mockReset()
})

describe('CheckBoxLabelForm', () => {
  it('shows the label as text until clicked, then reveals the edit field', async () => {
    renderForm()

    expect(screen.getByText('Original label')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Original label'))

    expect(screen.getByLabelText(/^label$/i)).toHaveValue('Original label')
  })

  it('submits the updated label to the checkbox endpoint', async () => {
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm()
    await userEvent.click(screen.getByText('Original label'))
    const field = screen.getByLabelText(/^label$/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'New label')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections/section-1/checkboxes/checkbox-1',
        {label: 'New label'}
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Label Updated', {variant: 'success'})
  })

  it('deletes the checkbox after confirmation', async () => {
    mockConfirm.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue({data: {item: {id: 'item-1', title: 'Item'}}})

    renderForm()
    await userEvent.click(screen.getByText('Original label'))
    await userEvent.click(screen.getByRole('button', {name: /^delete$/i}))

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections/section-1/checkboxes/checkbox-1'
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item Checklist Deleted', {variant: 'success'})
  })
})
