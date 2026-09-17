/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import handler from '@/pages/api/members/projects/[projectId]/items/[itemId]/sections'
import {createSection} from '@/mongo/controls/member/project/items/sections/createSection'

jest.mock('@/mongo/controls/member/project/items/sections/createSection', () => ({
  createSection: jest.fn(),
}))

const mockCreateSection = createSection

afterEach(() => {
  mockCreateSection.mockReset()
})

describe('items/[itemId]/sections handler', () => {
  it('dispatches POST to createSection', async () => {
    const {req, res} = createMocks({method: 'POST'})

    await handler(req, res)

    expect(mockCreateSection).toHaveBeenCalledTimes(1)
    expect(mockCreateSection).toHaveBeenCalledWith(req, res)
  })

  it('does not dispatch for an unsupported method', async () => {
    const {req, res} = createMocks({method: 'GET'})

    await handler(req, res)

    expect(mockCreateSection).not.toHaveBeenCalled()
  })
})
