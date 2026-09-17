/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
// eslint-disable-next-line max-len
import handler from '@/pages/api/members/projects/[projectId]/items/[itemId]/sections/[sectionId]/checkboxes/[checkboxId]'
import {
  patchCheckbox,
} from '@/mongo/controls/member/project/items/sections/checkboxes/patchCheckbox'
import {
  deleteCheckbox,
} from '@/mongo/controls/member/project/items/sections/checkboxes/deleteCheckbox'

jest.mock('@/mongo/controls/member/project/items/sections/checkboxes/patchCheckbox', () => ({
  patchCheckbox: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/items/sections/checkboxes/deleteCheckbox', () => ({
  deleteCheckbox: jest.fn(),
}))

const mockPatchCheckbox = patchCheckbox as jest.Mock
const mockDeleteCheckbox = deleteCheckbox as jest.Mock

afterEach(() => {
  mockPatchCheckbox.mockReset()
  mockDeleteCheckbox.mockReset()
})

describe('checkboxes/[checkboxId] handler', () => {
  it('dispatches PATCH to patchCheckbox', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await handler(req, res)

    expect(mockPatchCheckbox).toHaveBeenCalledTimes(1)
    expect(mockPatchCheckbox).toHaveBeenCalledWith(req, res)
    expect(mockDeleteCheckbox).not.toHaveBeenCalled()
  })

  it('dispatches DELETE to deleteCheckbox', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'DELETE'})

    await handler(req, res)

    expect(mockDeleteCheckbox).toHaveBeenCalledTimes(1)
    expect(mockDeleteCheckbox).toHaveBeenCalledWith(req, res)
    expect(mockPatchCheckbox).not.toHaveBeenCalled()
  })

  it('does not dispatch for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockPatchCheckbox).not.toHaveBeenCalled()
    expect(mockDeleteCheckbox).not.toHaveBeenCalled()
  })
})
