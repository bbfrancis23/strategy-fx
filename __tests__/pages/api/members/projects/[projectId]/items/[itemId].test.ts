/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import handler from '@/pages/api/members/projects/[projectId]/items/[itemId]'
import getItem from '@/mongo/controls/member/project/items/getItem'
import {patchItem} from '@/mongo/controls/member/project/items/patchItem'

// This route is a thin dispatcher with no logic of its own beyond picking
// a sub-handler by req.method — mocking those sub-handlers lets this test
// verify the dispatch table without needing a live DB or session. It's a
// template for the other similarly-shaped route handlers under pages/api.
jest.mock('@/mongo/controls/member/project/items/getItem', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/items/patchItem', () => ({
  patchItem: jest.fn(),
}))

const mockGetItem = getItem as jest.Mock
const mockPatchItem = patchItem as jest.Mock

afterEach(() => {
  mockGetItem.mockReset()
  mockPatchItem.mockReset()
})

describe('items/[itemId] handler', () => {
  it('dispatches GET to getItem', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {itemId: 'item-1'},
    })

    await handler(req, res)

    expect(mockGetItem).toHaveBeenCalledTimes(1)
    expect(mockGetItem).toHaveBeenCalledWith(req, res)
    expect(mockPatchItem).not.toHaveBeenCalled()
  })

  it('dispatches PATCH to patchItem', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: {itemId: 'item-1'},
    })

    await handler(req, res)

    expect(mockPatchItem).toHaveBeenCalledTimes(1)
    expect(mockPatchItem).toHaveBeenCalledWith(req, res)
    expect(mockGetItem).not.toHaveBeenCalled()
  })

  it('dispatches DELETE to patchItem', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'DELETE',
      query: {itemId: 'item-1'},
    })

    await handler(req, res)

    expect(mockPatchItem).toHaveBeenCalledTimes(1)
    expect(mockPatchItem).toHaveBeenCalledWith(req, res)
    expect(mockGetItem).not.toHaveBeenCalled()
  })

  it('returns 405 for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: {itemId: 'item-1'},
    })

    await handler(req, res)

    expect(mockGetItem).not.toHaveBeenCalled()
    expect(mockPatchItem).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toEqual({message: 'Invalid Method'})
  })
})
