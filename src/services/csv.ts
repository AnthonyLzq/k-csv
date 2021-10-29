import httpErrors from 'http-errors'
import { getStorage } from 'firebase-admin/storage'

import { DtoCsv } from '../dto-interfaces'
import { GE, errorHandling } from './utils'

type Process = {
  type: 'upload' | 'download'
}

class Csv {
  #args: DtoCsv

  constructor(args: DtoCsv) {
    this.#args = args
  }

  // eslint-disable-next-line consistent-return
  public process({ type }: Process): Promise<string> {
    // eslint-disable-next-line default-case
    switch (type) {
      case 'upload':
        return this.#upload()
      default:
        throw new httpErrors.InternalServerError(GE.INTERNAL_SERVER_ERROR)
    }
  }

  async #upload(): Promise<string> {
    try {
      const bucket = getStorage().bucket()
      const files = (await bucket.getFiles())[0]

      await Promise.all(files.map(f => f.delete()))

      const fileName = this.#args.name.split('.')[0]
      const timezone = Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone.replace(/\//g, '\\')
      const timeOffSet = new Date().getTimezoneOffset()
      const uploadTime = new Date(new Date().getTime() - timeOffSet * 60000)
      const finalDate = `${uploadTime.toISOString()}_${timezone}`
      const blob = bucket.file(`${fileName}_${finalDate}`)
      const blobWriter = blob.createWriteStream({
        metadata: {
          contentType: this.#args.mimetype
        }
      })

      await new Promise<void>((resolve, reject) => {
        blobWriter.on('error', e => {
          console.error(e)
          reject(e)
        })

        blobWriter.on('finish', () => resolve())

        blobWriter.end(this.#args.data)
      })

      return `Csv uploaded successfully at ${finalDate}`
    } catch (e) {
      return errorHandling(e, GE.INTERNAL_SERVER_ERROR)
    }
  }
}

export { Csv }
