/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import handler from '@/pages/api/items/vote/[itemId]'

describe('items/vote/[itemId] handler', () => {
  it('responds with a placeholder message (route not yet implemented)', () => {
    const {req, res} = createMocks({method: 'PATCH'})

    handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({message: 'comming soon'})
  })
})
