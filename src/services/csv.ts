import fs from 'fs'
import httpErrors from 'http-errors'
import csv from 'csvtojson'
import papaparse from 'papaparse'
// import { getStorage } from 'firebase-admin/storage'

import { DtoCsv } from '../dto-interfaces'
import { EFC, MFC, GE, errorHandling } from './utils'

type Process = {
  type: 'upload' | 'download'
}

class Csv {
  #args: DtoCsv | null
  #filePath: string

  constructor(args: DtoCsv | null = null) {
    this.#args = args
    this.#filePath =
      process.env.ENV === 'dev'
        ? `${__dirname}/../../files/`
        : `${__dirname}/../files/`
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
      const fileType = mimetype.split('/')[1]
      // const bucket = getStorage().bucket()
      // const files = (await bucket.getFiles())[0]

      // await Promise.all(files.map(f => f.delete()))

      const fileName = name.split('.')[0]
      const timezone = Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone.replace(/\//g, '\\')
      const timeOffSet = new Date().getTimezoneOffset()
      const uploadTime = new Date(new Date().getTime() - timeOffSet * 60000)
      const finalDate = `${uploadTime.toISOString()}_${timezone}`
      const finalName = `${fileName}_${finalDate}`

      await new Promise<void>((resolve, reject) => {
        fs.readdir(this.#filePath, (e, files) => {
          if (e) reject(e)
          else {
            for (const file of files) fs.unlinkSync(`${this.#filePath}${file}`)
            resolve()
          }
        })
      })

      await new Promise<void>((resolve, reject) => {
        fs.writeFile(
          `${this.#filePath}${finalName}.${fileType}`,
          data,
          'utf-8',
          e => {
            if (e) reject(e)
            else resolve()
          }
        )
      })
      // fs.createWriteStream()
      // const blob = bucket.file(`${fileName}_${finalDate}`)
      // const blobWriter = blob.createWriteStream({
      //   metadata: {
      //     contentType: mimetype
      //   }
      // })

      // await new Promise<void>((resolve, reject) => {
      //   blobWriter.on('error', e => {
      //     console.error(e)
      //     reject(e)
      //   })

      //   blobWriter.on('finish', () => resolve())

      //   blobWriter.end(data)
      // })

      return `${MFC.UPLOAD_SUCCESS}${finalDate}`
    } catch (e) {
      return errorHandling(e, GE.INTERNAL_SERVER_ERROR)
    }
  }

  async #download(): Promise<unknown[]> {
    try {
      const csvFile = await new Promise<string>((resolve, reject) => {
        fs.readdir(this.#filePath, (e, files) => {
          if (e) reject(e)
          else for (const file of files) resolve(file)
        })
      })
      const readStream = fs.createReadStream(`${this.#filePath}${csvFile}`)
      const parseStream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {
        delimiter: ';'
      })
      const data: unknown[] = []

      await new Promise<void>((resolve, reject) => {
        readStream.pipe(parseStream)

        parseStream.on('data', chunk => data.push(chunk))

        parseStream.on('error', e => {
          console.error(e)
          reject()
        })

        parseStream.on('finish', () => resolve())
      })
      // const bucket = getStorage().bucket()
      // const files = (await bucket.getFiles())[0]

      // if (files.length === 0) throw new httpErrors.Conflict(EFC.MISSING_CSV)

      // const file = files[0]
      // const readableStream = file.createReadStream()
      // const resultInJson = await csv({
      //   delimiter: [';', ','],
      //   trim     : true
      // }).fromFile(`${this.#filePath}${csvFile}`)
      return data
    } catch (e) {
      return errorHandling(e, GE.INTERNAL_SERVER_ERROR)
    }
  }
}

export { Csv }
