/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import {projectApi} from '@/pages/api/projects/[projectId]/projectApi'
import {patchProject} from '@/mongo/controls/project/patchProject'

jest.mock('@/mongo/controls/project/patchProject', () => ({
  patchProject: jest.fn(),
}))

const mockPatchProject = patchProject as jest.Mock

afterEach(() => {
  mockPatchProject.mockReset()
})

describe('projects/[projectId]/projectApi', () => {
  it('dispatches PATCH to patchProject', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    await projectApi(req, res)

    expect(mockPatchProject).toHaveBeenCalledTimes(1)
    expect(mockPatchProject).toHaveBeenCalledWith(req, res)
  })

  it('returns 405 for an unsupported method', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PUT'})

    await projectApi(req, res)

    expect(res.statusCode).toBe(405)
    expect(mockPatchProject).not.toHaveBeenCalled()
  })

  it('does not dispatch for DELETE (not yet implemented)', async () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'DELETE'})

    await projectApi(req, res)

    expect(mockPatchProject).not.toHaveBeenCalled()
    expect(res._isEndCalled()).toBe(false)
  })
})
