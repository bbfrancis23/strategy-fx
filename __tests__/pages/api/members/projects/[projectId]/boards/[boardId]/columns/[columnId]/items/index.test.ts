/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import {getServerSession} from 'next-auth/next'
// eslint-disable-next-line max-len
import handler from '@/pages/api/members/projects/[projectId]/boards/[boardId]/columns/[columnId]/items'
import {createItem} from '@/mongo/controls/member/project/board/column/item/createItem'

jest.mock('next-auth/next', () => ({
  ...jest.requireActual('next-auth/next'),
  __esModule: true,
  getServerSession: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/board/column/item/createItem', () => ({
  createItem: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.Mock
const mockCreateItem = createItem as jest.Mock

afterEach(() => {
  mockGetServerSession.mockReset()
  mockCreateItem.mockReset()
})

describe('columns/[columnId]/items handler', () => {
  it('returns 401 when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await handler(req, res)

    expect(res.statusCode).toBe(axios.HttpStatusCode.Unauthorized)
    expect(mockCreateItem).not.toHaveBeenCalled()
  })

  it('dispatches POST to createItem for an authenticated request', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await handler(req, res)

    expect(mockCreateItem).toHaveBeenCalledTimes(1)
    expect(mockCreateItem).toHaveBeenCalledWith(req, res)
  })

  it('does not dispatch for an unsupported method', async () => {
    mockGetServerSession.mockResolvedValue({user: {id: 'someid'}})

    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockCreateItem).not.toHaveBeenCalled()
  })
})
