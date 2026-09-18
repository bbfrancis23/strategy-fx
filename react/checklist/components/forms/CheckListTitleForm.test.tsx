import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useSnackbar} from 'notistack'
import {useConfirm} from 'material-ui-confirm'
import axios from 'axios'
import {SectionContext} from '@/react/section'
import {ProjectContext} from '@/react/project'
import {ItemContext} from '@/react/item'
import {CheckListTitleForm} from './CheckListTitleForm'

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

const renderForm = (closeForm = jest.fn()) =>
  render(
    <ProjectContext.Provider value={{project: {id: 'project-1'} as any, setProject: jest.fn()}}>
      <ItemContext.Provider
        value={{item: {id: 'item-1', title: 'Item'} as any, setItem: mockSetItem}}
      >
        <SectionContext.Provider
          value={{
            section: {id: 'section-1', content: 'Checklist Title'} as any,
            setSection: jest.fn(),
          }}
        >
          <CheckListTitleForm closeForm={closeForm} />
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

describe('CheckListTitleForm', () => {
  it('pre-fills the field with the current section content', () => {
    renderForm()

    expect(screen.getByLabelText(/checklist title/i)).toHaveValue('Checklist Title')
  })

  it('submits the updated title and closes the form on success', async () => {
    const closeForm = jest.fn()
    mockPatch.mockResolvedValue({
      status: axios.HttpStatusCode.Ok,
      data: {item: {id: 'item-1', title: 'Item'}},
    })

    renderForm(closeForm)
    const field = screen.getByLabelText(/checklist title/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'New Checklist Title')
    await userEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections/section-1',
        {content: 'New Checklist Title', sectiontype: '6563a7fdbf30bb677e252c56'}
      )
    )
    expect(mockSetItem).toHaveBeenCalledWith({id: 'item-1', title: 'Item'})
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item Checklist Updated', {variant: 'success'})
    expect(closeForm).toHaveBeenCalled()
  })

  it('deletes the section after confirmation', async () => {
    const closeForm = jest.fn()
    mockConfirm.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue({data: {item: {id: 'item-1', title: 'Item'}}})

    renderForm(closeForm)
    await userEvent.click(screen.getByRole('button', {name: /^delete$/i}))

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/members/projects/project-1/items/item-1/sections/section-1'
      )
    )
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Item Checklist Deleted', {variant: 'success'})
    expect(closeForm).toHaveBeenCalled()
  })
})
