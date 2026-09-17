/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {projectsApi} from '@/pages/api/projects/projectsApi'
import createProject from '@/mongo/controls/project/createProject'

jest.mock('@/mongo/controls/project/createProject', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockCreateProject = createProject as jest.Mock

afterEach(() => {
  mockCreateProject.mockReset()
})

describe('projects/projectsApi', () => {
  it('dispatches POST to createProject', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'POST'})

    await projectsApi(req, res)

    expect(mockCreateProject).toHaveBeenCalledTimes(1)
    expect(mockCreateProject).toHaveBeenCalledWith(req, res)
  })

  it('returns 405 for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PUT'})

    await projectsApi(req, res)

    expect(res.statusCode).toBe(405)
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('does not dispatch for GET (not yet implemented)', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    await projectsApi(req, res)

    expect(mockCreateProject).not.toHaveBeenCalled()
    expect(res._isEndCalled()).toBe(false)
  })
})
