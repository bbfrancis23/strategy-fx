/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import handler from '@/pages/api/members/projects/[projectId]/boards/[boardId]/columns'
import {createColumn} from '@/mongo/controls/member/project/board/column/createColumn'

jest.mock('@/mongo/controls/member/project/board/column/createColumn', () => ({
  createColumn: jest.fn(),
}))

const mockCreateColumn = createColumn

afterEach(() => {
  mockCreateColumn.mockReset()
})

describe('boards/[boardId]/columns handler', () => {
  it('dispatches POST to createColumn', async () => {
    const {req, res} = createMocks({method: 'POST'})

    await handler(req, res)

    expect(mockCreateColumn).toHaveBeenCalledTimes(1)
    expect(mockCreateColumn).toHaveBeenCalledWith(req, res)
  })

  it('does not dispatch for an unsupported method', async () => {
    const {req, res} = createMocks({method: 'GET'})

    await handler(req, res)

    expect(mockCreateColumn).not.toHaveBeenCalled()
  })
})
