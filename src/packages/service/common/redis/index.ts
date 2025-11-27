import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const newQueueRedisConnection = () => {
  const redis = new Redis(REDIS_URL);
  redis.on('connect', () => {
    console.log('Redis connected');
  });
  redis.on('error', (error) => {
    console.error('Redis connection error', error);
  });
  return redis;
};

export const newWorkerRedisConnection = () => {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null
  });
  redis.on('connect', () => {
    console.log('Redis connected');
  });
  redis.on('error', (error) => {
    console.error('Redis connection error', error);
  });
  return redis;
};

export const FASTGPT_REDIS_PREFIX = 'fastgpt:';

export const getGlobalRedisConnection = () => {
  if (global.redisClient) return global.redisClient;

  global.redisClient = new Redis(REDIS_URL, { keyPrefix: FASTGPT_REDIS_PREFIX });

  global.redisClient.on('connect', () => {
    console.log('Redis connected');
  });
  global.redisClient.on('error', (error) => {
    console.error('Redis connection error', error);
  });

  return global.redisClient;
};

export const getAllKeysByPrefix = async (key: string) => {
  const redis = getGlobalRedisConnection();
  // 注意：redis 客户端已配置 keyPrefix，keys() 会自动加前缀
  // 所以这里只需要传入不带前缀的 pattern
  // 返回的 keys 也会自动带上前缀，需要去掉
  const keys = (await redis.keys(`${key}:*`)).map((k) =>
    k.replace(FASTGPT_REDIS_PREFIX, '')
  );
  return keys;
};
