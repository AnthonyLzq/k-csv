import { Response, NextFunction } from 'express'
import httpErrors from 'http-errors'

import { Request } from '../custom'

enum ErrorsForUnauthenticatedRequest {
  MISSING_API_KEY = 'Missing api key',
  WRONG_API_KEY = 'Wrong api key'
}

const verifyApiKeyExists = async (
  req : Request,
  res : Response,
  next: NextFunction
): Promise<void> => {
  const { headers } = req
  const apiKey = headers['api-key']

  if (!apiKey)
    return next(
      new httpErrors.Unauthorized(
        ErrorsForUnauthenticatedRequest.MISSING_API_KEY
      )
    )

  next()
}

const verifyCorrectApiKey = async (
  req : Request,
  res : Response,
  next: NextFunction
): Promise<void> => {
  const { headers } = req
  const apiKey = headers['api-key']

  if (!apiKey)
    return next(
      new httpErrors.Unauthorized(
        ErrorsForUnauthenticatedRequest.MISSING_API_KEY
      )
    )

  const API_KEY = process.env.API_KEY as string

  if (apiKey !== API_KEY)
    return next(
      new httpErrors.Unauthorized(
        ErrorsForUnauthenticatedRequest.WRONG_API_KEY
      )
    )

  next()
}

export { verifyApiKeyExists, verifyCorrectApiKey }
