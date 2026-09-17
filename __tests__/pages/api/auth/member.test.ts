/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiRequest, NextApiResponse} from 'next'
import axios from 'axios'
import handler from '@/pages/api/auth/member'
import {updateMember} from '@/mongo/controls/member/memberControls'

jest.mock('@/mongo/controls/member/memberControls', () => ({
  updateMember: jest.fn(),
}))

const mockUpdateMember = updateMember as jest.Mock

afterEach(() => {
  mockUpdateMember.mockReset()
})

describe('auth/member handler', () => {
  it('dispatches PATCH to updateMember', () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'PATCH'})

    handler(req, res)

    expect(mockUpdateMember).toHaveBeenCalledTimes(1)
    expect(mockUpdateMember).toHaveBeenCalledWith(req, res)
  })

  it('returns 406 and does not dispatch for an unsupported method', () => {
    const {req, res} = createMocks<NextApiRequest, NextApiResponse>({method: 'GET'})

    handler(req, res)

    expect(mockUpdateMember).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(axios.HttpStatusCode.NotAcceptable)
  })
})
