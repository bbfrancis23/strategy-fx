/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {boardApi} from '@/pages/api/projects/[projectId]/boards/boardsApi'
import createBoard from '@/mongo/controls/board/createBoard'

jest.mock('@/mongo/controls/board/createBoard', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockCreateBoard = createBoard as jest.Mock

afterEach(() => {
  mockCreateBoard.mockReset()
})

describe('projects/[projectId]/boards/boardsApi', () => {
  it('dispatches POST to createBoard', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await boardApi(req, res)

    expect(mockCreateBoard).toHaveBeenCalledTimes(1)
    expect(mockCreateBoard).toHaveBeenCalledWith(req, res)
  })

  it('returns 405 for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PUT'})

    await boardApi(req, res)

    expect(res.statusCode).toBe(405)
    expect(mockCreateBoard).not.toHaveBeenCalled()
  })
})
