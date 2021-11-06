import httpErrors from 'http-errors'
import parse from 'papaparse'
import { getStorage } from 'firebase-admin/storage'

import { redisClient } from '../database'
import { DtoCsv } from '../dto-interfaces'
import { EFC, MFC, GE, errorHandling } from './utils'

type Process = {
  type: 'upload' | 'download'
}

class Csv {
  #args: DtoCsv | null

  constructor(args: DtoCsv | null = null) {
    this.#args = args
  }

  // eslint-disable-next-line consistent-return
  public process({ type }: Process): Promise<string | unknown[]> {
    // eslint-disable-next-line default-case
    switch (type) {
      case 'upload':
        return this.#upload()
      case 'download':
        return this.#download()
      default:
        throw new httpErrors.InternalServerError(GE.INTERNAL_SERVER_ERROR)
    }
  }

  async #upload(): Promise<string> {
    try {
      if (!this.#args)
        throw new httpErrors.InternalServerError(GE.INTERNAL_SERVER_ERROR)

      const { name, mimetype, data } = this.#args
      const bucket = getStorage().bucket()
      const files = (await bucket.getFiles())[0]

      await Promise.all(files.map(f => f.delete()))

      const fileName = name.split('.')[0]
      const timezone = Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone.replace(/\//g, '\\')
      const timeOffSet = new Date().getTimezoneOffset()
      const uploadTime = new Date(new Date().getTime() - timeOffSet * 60000)
      const finalDate = `${uploadTime.toISOString()}_${timezone}`
      const finalName = `${fileName}_${finalDate}`

      redisClient.set('file', finalName, (e, reply) => {
        if (e) {
          console.log('There was an error trying to store the file in redis')
          console.error(e)
        } else console.log(`Saved the file ${finalName}. Reply: ${reply}`)
      })

      const file = bucket.file(finalName)
      const writeableStream = file.createWriteStream({
        metadata: {
          contentType: mimetype
        }
      })

      await new Promise<void>((resolve, reject) => {
        writeableStream.on('error', e => {
          console.error(e)
          reject(e)
        })

        writeableStream.on('finish', () => resolve())

        writeableStream.end(data)
      })

      return `${MFC.UPLOAD_SUCCESS}${finalDate}`
    } catch (e) {
      return errorHandling(e, GE.INTERNAL_SERVER_ERROR)
    }
  }

  async #download(): Promise<unknown[]> {
    try {
      const fileNameSaved = await new Promise<string | null>(
        (resolve, reject) => {
          redisClient.get('file', (e, reply) => {
            if (e) {
              console.log('There was not any file stored in redis')
              reject()
            } else {
              console.log(`File ${reply} was stored in redis`)
              resolve(reply)
            }
          })
        }
      )
      const bucket = getStorage().bucket()
      const files = (await bucket.getFiles())[0]

      if (files.length === 0)
        throw new httpErrors.Conflict(EFC.MISSING_CSV)

      const file = files[0]
      const readableStream = file.createReadStream()
      const parseStream = parse.parse(parse.NODE_STREAM_INPUT, {
        delimiter: ';'
      })
      const data: unknown[] = []

      await new Promise<void>((resolve, reject) => {
        readableStream.pipe(parseStream)

        parseStream.on('data', chunk => data.push(chunk))

        parseStream.on('error', e => {
          console.error(e)
          reject()
        })

        parseStream.on('finish', () => resolve())
      })

      return data
    } catch (e) {
      return errorHandling(e, GE.INTERNAL_SERVER_ERROR)
    }
  }
}

export { Csv }
