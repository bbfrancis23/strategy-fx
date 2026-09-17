/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import handler from '@/pages/api/members/projects/[projectId]/items/[itemId]/comments/[commentId]'
import {deleteComment} from '@/mongo/controls/member/project/items/comments/deleteComment'
import {patchComment} from '@/mongo/controls/member/project/items/comments/patchComment'

jest.mock('@/mongo/controls/member/project/items/comments/deleteComment', () => ({
  deleteComment: jest.fn(),
}))
jest.mock('@/mongo/controls/member/project/items/comments/patchComment', () => ({
  patchComment: jest.fn(),
}))

const mockDeleteComment = deleteComment as jest.Mock
const mockPatchComment = patchComment as jest.Mock

afterEach(() => {
  mockDeleteComment.mockReset()
  mockPatchComment.mockReset()
})

describe('comments/[commentId] handler', () => {
  it('dispatches PATCH to patchComment', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await handler(req, res)

    expect(mockPatchComment).toHaveBeenCalledTimes(1)
    expect(mockPatchComment).toHaveBeenCalledWith(req, res)
    expect(mockDeleteComment).not.toHaveBeenCalled()
  })

  it('dispatches DELETE to deleteComment', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'DELETE'})

    await handler(req, res)

    expect(mockDeleteComment).toHaveBeenCalledTimes(1)
    expect(mockDeleteComment).toHaveBeenCalledWith(req, res)
    expect(mockPatchComment).not.toHaveBeenCalled()
  })

  it('does not dispatch for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await handler(req, res)

    expect(mockDeleteComment).not.toHaveBeenCalled()
    expect(mockPatchComment).not.toHaveBeenCalled()
  })
})
