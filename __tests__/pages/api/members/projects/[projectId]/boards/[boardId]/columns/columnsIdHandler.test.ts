/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
// eslint-disable-next-line max-len
import handler from '@/pages/api/members/projects/[projectId]/boards/[boardId]/columns/columnsIdHandler'
import {patchColumn} from '@/mongo/controls/member/project/board/column/patchColumn'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/board/column/patchColumn', () => ({
  patchColumn: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.Mock
const mockPatchColumn = patchColumn as jest.Mock

afterEach(() => {
  mockGetServerSession.mockReset()
  mockPatchColumn.mockReset()
})

describe('columns/columnsIdHandler', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    expect(mockPatchColumn).not.toHaveBeenCalled()
  })

  it('dispatches PATCH to patchColumn', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await handler(req, res)

    expect(mockPatchColumn).toHaveBeenCalledTimes(1)
    expect(mockPatchColumn).toHaveBeenCalledWith(req, res)
  })

  it('dispatches DELETE to patchColumn', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'DELETE'})

    await handler(req, res)

    expect(mockPatchColumn).toHaveBeenCalledTimes(1)
    expect(mockPatchColumn).toHaveBeenCalledWith(req, res)
  })

  it('does not dispatch for GET', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockPatchColumn).not.toHaveBeenCalled()
  })
})
