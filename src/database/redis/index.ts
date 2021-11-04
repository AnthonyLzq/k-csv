import redis, { RedisClient } from 'redis'

let client: RedisClient

const redisConnection = () => {
  client = redis.createClient({
    host: '127.0.0.1',
    port: 6739
  })
}

export { redisConnection, client }
