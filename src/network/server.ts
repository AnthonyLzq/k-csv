import express from 'express'
import morgan from 'morgan'
import upload from 'express-fileupload'

import {
  redisConnection,
  supabaseConnection
} from '../database'
import { applyRoutes } from './routes'

class Server {
  #app : express.Application
  #port: string

  constructor() {
    this.#app = express()
    this.#port = process.env.PORT as string || '1996'
    this.#config()
  }

  #config() {
    this.#app.set('port', this.#port)
    this.#app.use(morgan('dev'))
    this.#app.use(express.json())
    this.#app.use(upload({
      limits: {
        fileSize: 500_000_000
      }
    }))
    this.#app.use(express.urlencoded({ extended: false }))
    this.#app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        res.header('Access-Control-Allow-Headers', ['api-key', 'content-type'])
        res.header('X-Powered-By', 'Blood, sweat, and tears')
        res.header('Access-Control-Allow-Methods', 'GET, POST')
        res.header('Access-Control-Allow-Origin', '*')
        next()
      }
    )
    applyRoutes(this.#app)
  }

  public start(): void {
    this.#app.listen(this.#port, () =>
      console.log(`Server running at port ${this.#port}.`)
    )

    try {
      redisConnection()
      supabaseConnection()
    } catch (e) {
      console.error(e)
    }
  }
}

const server = new Server()

export { server as Server }
