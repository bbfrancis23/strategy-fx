/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
import handler from '@/pages/api/members/projects/[projectId]/boards/boardsIdHandler'
import {patchBoard} from '@/mongo/controls/member/project/board/patchBoard'
import {patchBoardCols} from '@/mongo/controls/member/project/board/patchBoardCols'
import {getBoard} from '@/mongo/controls/board/findBoard'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/board/patchBoard', () => ({
  patchBoard: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/board/patchBoardCols', () => ({
  patchBoardCols: jest.fn(),
}))
jest.mock('@/mongo/controls/board/findBoard', () => ({
  getBoard: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.Mock
const mockPatchBoard = patchBoard as jest.Mock
const mockPatchBoardCols = patchBoardCols as jest.Mock
const mockGetBoard = getBoard as jest.Mock

afterEach(() => {
  mockGetServerSession.mockReset()
  mockPatchBoard.mockReset()
  mockPatchBoardCols.mockReset()
  mockGetBoard.mockReset()
})

describe('boards/boardsIdHandler', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    expect(mockGetBoard).not.toHaveBeenCalled()
  })

  it('dispatches GET to getBoard', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockGetBoard).toHaveBeenCalledTimes(1)
    expect(mockPatchBoard).not.toHaveBeenCalled()
    expect(mockPatchBoardCols).not.toHaveBeenCalled()
  })

  it('dispatches PATCH to patchBoard when the body has no boardCols', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {title: 'New Title'},
    })

    await handler(req, res)

    expect(mockPatchBoard).toHaveBeenCalledTimes(1)
    expect(mockPatchBoardCols).not.toHaveBeenCalled()
  })

  it('dispatches PATCH to patchBoardCols when the body has boardCols', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      body: {boardCols: ['col-1']},
    })

    await handler(req, res)

    expect(mockPatchBoardCols).toHaveBeenCalledTimes(1)
    expect(mockPatchBoard).not.toHaveBeenCalled()
  })

  it('dispatches DELETE to patchBoard', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'DELETE'})

    await handler(req, res)

    expect(mockPatchBoard).toHaveBeenCalledTimes(1)
  })
})
