/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {colsApi} from '@/pages/api/projects/[projectId]/cols/colApi'

describe('projects/[projectId]/cols/colApi', () => {
  it('dispatches PATCH without error', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await colsApi(req, res)

    // updateCols is currently an unimplemented no-op, so PATCH falls
    // through without setting a response — this pins that behavior rather
    // than the 405 an unsupported method would get.
    expect(res._isEndCalled()).toBe(false)
  })

  it('returns 405 for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await colsApi(req, res)

    expect(res.statusCode).toBe(405)
  })
})
