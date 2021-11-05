import redis, { RedisClient } from 'redis'

let redisClient: RedisClient

const redisConnection = () => {
  redisClient = redis.createClient({
    host: '127.0.0.1',
    port: 6379
  })
  console.log('Redis connection established.')
}

export { redisConnection, redisClient }
