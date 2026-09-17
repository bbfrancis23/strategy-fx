/** @jest-environment node */
import {createMocks} from 'node-mocks-http'
import {NextApiResponse} from 'next'
import axios from 'axios'
import * as responses from './responses'

// Every export here follows the same shape: `(res, message) =>
// res.status(<fixed code>).json({message})`. A table-driven test avoids
// duplicating the same three assertions ~20 times for what's otherwise
// identical boilerplate per status code.
const cases: [keyof typeof responses, number][] = [
  ['unauthorizedResponse', axios.HttpStatusCode.Unauthorized],
  ['unauthRes', axios.HttpStatusCode.Unauthorized],
  ['notFoundResponse', axios.HttpStatusCode.NotFound],
  ['notFoundRes', axios.HttpStatusCode.NotFound],
  ['forbiddenResponse', axios.HttpStatusCode.Forbidden],
  ['forbiddenRes', axios.HttpStatusCode.Forbidden],
  ['MethodNotAllowedResponse', axios.HttpStatusCode.MethodNotAllowed],
  ['badRequestResponse', axios.HttpStatusCode.BadRequest],
  ['internalServerErrorResponse', axios.HttpStatusCode.InternalServerError],
  ['serverErrRes', axios.HttpStatusCode.InternalServerError],
  ['okResponse', axios.HttpStatusCode.Ok],
  ['createdResponse', axios.HttpStatusCode.Created],
  ['createdRes', axios.HttpStatusCode.Created],
  ['noContentResponse', axios.HttpStatusCode.NoContent],
  ['emptyFieldRes', axios.HttpStatusCode.UnprocessableEntity],
  ['conflictResponse', axios.HttpStatusCode.Conflict],
  ['tooManyRequestsResponse', axios.HttpStatusCode.TooManyRequests],
  ['notImplementedResponse', axios.HttpStatusCode.NotImplemented],
  ['serviceUnavailableResponse', axios.HttpStatusCode.ServiceUnavailable],
  ['gatewayTimeoutResponse', axios.HttpStatusCode.GatewayTimeout],
  ['httpVersionNotSupportedResponse', axios.HttpStatusCode.HttpVersionNotSupported],
  ['variantAlsoNegotiatesResponse', axios.HttpStatusCode.VariantAlsoNegotiates],
  ['insufficientStorageResponse', axios.HttpStatusCode.InsufficientStorage],
  ['loopDetectedResponse', axios.HttpStatusCode.LoopDetected],
  ['notExtendedResponse', axios.HttpStatusCode.NotExtended],
]

describe('responses', () => {
  it.each(cases)('%s sends status %d with the given message', async (name, expectedStatus) => {
    const {res} = createMocks<any, NextApiResponse>()

    await (responses[name] as (res: NextApiResponse, message: string) => Promise<void>)(
      res,
      'a message',
    )

    expect(res.statusCode).toBe(expectedStatus)
    expect(res._getJSONData()).toEqual({message: 'a message'})
  })
})
