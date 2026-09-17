/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {boardIdApi} from '@/pages/api/projects/[projectId]/boards/[boardId]/boardApi'
import {getBoard} from '@/mongo/controls/board/findBoard'
import {patchBoard} from '@/mongo/controls/board/patchBoard'

jest.mock('@/mongo/controls/board/findBoard', () => ({
  getBoard: jest.fn(),
}))
jest.mock('@/mongo/controls/board/patchBoard', () => ({
  patchBoard: jest.fn(),
}))

const mockGetBoard = getBoard as jest.Mock
const mockPatchBoard = patchBoard as jest.Mock

afterEach(() => {
  mockGetBoard.mockReset()
  mockPatchBoard.mockReset()
})

describe('projects/[projectId]/boards/[boardId]/boardApi', () => {
  it('dispatches PATCH to patchBoard', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await boardIdApi(req, res)

    expect(mockPatchBoard).toHaveBeenCalledTimes(1)
    expect(mockPatchBoard).toHaveBeenCalledWith(req, res)
    expect(mockGetBoard).not.toHaveBeenCalled()
  })

  it('dispatches GET to getBoard', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await boardIdApi(req, res)

    expect(mockGetBoard).toHaveBeenCalledTimes(1)
    expect(mockGetBoard).toHaveBeenCalledWith(req, res)
    expect(mockPatchBoard).not.toHaveBeenCalled()
  })

  it('returns 405 for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PUT'})

    await boardIdApi(req, res)

    expect(res.statusCode).toBe(405)
    expect(mockGetBoard).not.toHaveBeenCalled()
    expect(mockPatchBoard).not.toHaveBeenCalled()
  })
})
