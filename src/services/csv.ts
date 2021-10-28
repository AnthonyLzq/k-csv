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
      const blob = bucket.file(this.#args.name)
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

      return 'Csv uploaded successfully'
    } catch (e) {
      return errorHandling(e, GE.INTERNAL_SERVER_ERROR)
    }
  }
}

export { Csv }
