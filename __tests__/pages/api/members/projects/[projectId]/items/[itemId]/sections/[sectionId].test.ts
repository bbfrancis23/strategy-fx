/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import handler from '@/pages/api/members/projects/[projectId]/items/[itemId]/sections/[sectionId]'
import {patchSection} from '@/mongo/controls/member/project/items/sections/patchSection'
import {deleteSection} from '@/mongo/controls/member/project/items/sections/deleteSection'

jest.mock('@/mongo/controls/member/project/items/sections/patchSection', () => ({
  patchSection: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/items/sections/deleteSection', () => ({
  deleteSection: jest.fn(),
}))

const mockPatchSection = patchSection as jest.Mock
const mockDeleteSection = deleteSection as jest.Mock

afterEach(() => {
  mockPatchSection.mockReset()
  mockDeleteSection.mockReset()
})

describe('sections/[sectionId] handler', () => {
  it('dispatches PATCH to patchSection', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await handler(req, res)

    expect(mockPatchSection).toHaveBeenCalledTimes(1)
    expect(mockPatchSection).toHaveBeenCalledWith(req, res)
    expect(mockDeleteSection).not.toHaveBeenCalled()
  })

  it('dispatches DELETE to deleteSection', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'DELETE'})

    await handler(req, res)

    expect(mockDeleteSection).toHaveBeenCalledTimes(1)
    expect(mockDeleteSection).toHaveBeenCalledWith(req, res)
    expect(mockPatchSection).not.toHaveBeenCalled()
  })

  it('does not dispatch for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockPatchSection).not.toHaveBeenCalled()
    expect(mockDeleteSection).not.toHaveBeenCalled()
  })
})
