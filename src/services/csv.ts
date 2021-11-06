import httpErrors from 'http-errors'
import papa from 'papaparse'

import { redisClient, supabaseClient } from '../database'
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

      const { name, data } = this.#args

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
          console.log(EFC.REDIS_SET)
          console.error(e)
        } else console.log(`Saved the file ${finalName}. Reply: ${reply}`)
      })

      const { error: emptyError } = await supabaseClient.storage.emptyBucket(
        'k-csv-files'
      )

      if (emptyError) throw emptyError

      const { error: uploadError } = await supabaseClient.storage
        .from('k-csv-files')
        .upload(finalName, data)

      if (uploadError) throw uploadError

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
      let file: NodeJS.ReadableStream

      if (fileNameSaved) {
        const { data, error: downloadError } = await supabaseClient.storage
          .from('k-csv-files')
          .download(fileNameSaved)

        if (downloadError) throw downloadError

        if (!data) throw new httpErrors.Conflict(EFC.MISSING_CSV)

        file = data.stream()
      } else {
        const { data: files, error: listError } = await supabaseClient.storage
          .from('k-csv-files')
          .list()

        if (listError) throw listError

        if (!files || files.length === 0)
          throw new httpErrors.Conflict(EFC.MISSING_CSV)

        const { data, error: downloadError } = await supabaseClient.storage
          .from('k-csv-files')
          .download(files[0].name)

        if (downloadError) throw downloadError

        if (!data) throw new httpErrors.Conflict(EFC.MISSING_CSV)

        file = data.stream()
      }


      const parseStream = papa.parse(papa.NODE_STREAM_INPUT, {
        delimiter: ';'
      })
      const data: unknown[] = []

      await new Promise<void>((resolve, reject) => {
        file.pipe(parseStream)

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
