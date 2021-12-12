import { Response, Router, NextFunction } from 'express'
import { UploadedFile } from 'express-fileupload'
import cors from 'cors'
import { ValidationError } from 'joi'
import httpErrors from 'http-errors'

import { Request } from '../custom'
import { Csv as CsvC } from '../services'
import { DtoCsv } from '../dto-interfaces'
import { csvSchema } from '../schemas'
import { response, verifyApiKeyExists, verifyCorrectApiKey } from '../utils'

const Csv = Router()

const getFileObject = (input: UploadedFile | UploadedFile[]): UploadedFile => {
  if (Array.isArray(input)) return input[0]

  return input
}

Csv.route('/csv')
  .post(
    cors(),
    verifyApiKeyExists,
    verifyCorrectApiKey,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.files) {
        const { files } = req
        const file = Object.keys(files)[0]
        const fileObj = getFileObject(files[file])

        try {
          const fileToUpload: DtoCsv = {
            data    : fileObj.data,
            encoding: fileObj.encoding,
            mimetype: fileObj.mimetype,
            name    : fileObj.name,
            size    : fileObj.size
          }
          const csv = new CsvC(fileToUpload)
          const result = await csv.process({ type: 'upload' })

          await csvSchema.validateAsync(fileToUpload)
          response(false, result, res, 201)
        } catch (e) {
          if (e instanceof ValidationError)
            return next(new httpErrors.UnprocessableEntity(e.message))

          next(e)
        }
      } else next(new httpErrors.BadRequest('Missing file'))
    }
  )
  .get(
    cors(),
    verifyApiKeyExists,
    verifyCorrectApiKey,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const csv = new CsvC()
        const result = await csv.process({ type: 'downloadFileContent' })

        response(false, result, res, 200)
      } catch (e) {
        if (e instanceof ValidationError)
          return next(new httpErrors.UnprocessableEntity(e.message))

        next(e)
      }
    }
  )

Csv.route('/csvFile')
  .get(
    cors(),
    verifyApiKeyExists,
    verifyCorrectApiKey,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const csv = new CsvC()
        const result = await csv.process({ type: 'downloadFile' }) as DownloadFileResponse

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${result.name}.csv"`
        )
        res.setHeader('Content-Type', 'text/csv')
        res.status(200).send(result.buffer)
      } catch (e) {
        if (e instanceof ValidationError)
          return next(new httpErrors.UnprocessableEntity(e.message))

        next(e)
      }
    }
  )

export { Csv }
