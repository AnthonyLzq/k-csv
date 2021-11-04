import redis, { RedisClient } from 'redis'

let client: RedisClient

const redisConnection = () => {
  client = redis.createClient({
    host: 'localhost',
    port: 6739
  })
}

export { redisConnection, client }
