/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import handler from '@/pages/api/members/projects/[projectId]/items/[itemId]/comments'
import {createComment} from '@/mongo/controls/member/project/items/comments/createComment'

jest.mock('@/mongo/controls/member/project/items/comments/createComment', () => ({
  createComment: jest.fn(),
}))

const mockCreateComment = createComment as jest.Mock

afterEach(() => {
  mockCreateComment.mockReset()
})

describe('items/[itemId]/comments handler', () => {
  it('dispatches POST to createComment', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await handler(req, res)

    expect(mockCreateComment).toHaveBeenCalledTimes(1)
    expect(mockCreateComment).toHaveBeenCalledWith(req, res)
  })

  it('does not dispatch for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockCreateComment).not.toHaveBeenCalled()
  })
})
