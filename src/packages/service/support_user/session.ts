import { getAllKeysByPrefix, getGlobalRedisConnection } from '../common/redis';
import { ERROR_ENUM } from '../../global/common/error/errorCode';
import { getNanoid } from '../../global/common/string/tools';

const redisPrefix = 'session:';
const getSessionKey = (key: string) => `${redisPrefix}${key}`;

export type SessionType = {
  userId: string;
  teamId: string;
  tmbId: string;
  isRoot?: boolean;
  createdAt: number;
  ip?: string | null;
};

/* Session manager */
const setSession = async ({
  key,
  data,
  expireSeconds
}: {
  key: string;
  data: SessionType;
  expireSeconds: number;
}) => {
  try {
    const redis = getGlobalRedisConnection();
    const formatKey = getSessionKey(key);

    // 使用 hmset 存储对象字段
    await redis.hmset(formatKey, {
      userId: data.userId,
      teamId: data.teamId,
      tmbId: data.tmbId,
      isRoot: data.isRoot ? '1' : '0',
      createdAt: data.createdAt.toString(),
      ip: data.ip || ''
    });

    // 设置过期时间
    if (expireSeconds) {
      await redis.expire(formatKey, expireSeconds);
    }
  } catch (error) {
    console.error('Set session error:', error);
    return Promise.reject(error);
  }
};

const delSession = (key: string) => {
  const redis = getGlobalRedisConnection();
  redis.del(getSessionKey(key)).catch((err) => console.error('Delete session error:', err));
};

/**
 * 获取 session
 *
 * key 格式: userId:nanoid（与官方 FastGPT 一致）
 * Redis 存储的完整 key: fastgpt:session:userId:nanoid
 */
const getSession = async (key: string): Promise<SessionType> => {
  const formatKey = getSessionKey(key);
  const redis = getGlobalRedisConnection();

  // 使用 hgetall 获取所有字段
  const data = await redis.hgetall(formatKey);

  if (!data || Object.keys(data).length === 0) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }

  try {
    return {
      userId: data.userId,
      teamId: data.teamId,
      tmbId: data.tmbId,
      isRoot: data.isRoot === '1',
      createdAt: parseInt(data.createdAt),
      ip: data.ip
    };
  } catch (error) {
    console.error('Parse session error:', error);
    delSession(formatKey);
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }
};

export const delUserAllSession = async (userId: string, whiteList?: (string | undefined)[]) => {
  // whiteList 中的 key 格式是 userId:nanoid，需要加上 session: 前缀
  const formatWhiteList = whiteList?.map((item) => item && getSessionKey(item));
  const redis = getGlobalRedisConnection();
  // getAllKeysByPrefix 返回不带 fastgpt: 前缀的 key
  // 格式为 session:userId:nanoid
  const keys = (await getAllKeysByPrefix(`${redisPrefix}${String(userId)}`)).filter(
    (item) => !formatWhiteList?.includes(item)
  );

  if (keys.length > 0) {
    // redis 客户端有 keyPrefix，会自动加上 fastgpt: 前缀
    await redis.del(keys);
  }
};

// 会根据创建时间，删除超出客户端登录限制的 session
const delRedundantSession = async (userId: string) => {
  // 至少为 1，默认为 10
  let maxSession = process.env.MAX_LOGIN_SESSION ? Number(process.env.MAX_LOGIN_SESSION) : 10;
  if (maxSession < 1) {
    maxSession = 1;
  }

  const redis = getGlobalRedisConnection();
  const keys = await getAllKeysByPrefix(`${redisPrefix}${userId}`);

  if (keys.length <= maxSession) {
    return;
  }

  // 获取所有会话的创建时间
  const sessionList = await Promise.all(
    keys.map(async (key) => {
      try {
        const data = await redis.hgetall(key);
        if (!data || Object.keys(data).length === 0) return null;

        return {
          key,
          createdAt: parseInt(data.createdAt)
        };
      } catch (error) {
        return null;
      }
    })
  );

  // 过滤掉无效数据并按创建时间排序
  const validSessions = sessionList.filter(Boolean) as { key: string; createdAt: number }[];

  validSessions.sort((a, b) => a.createdAt - b.createdAt);

  // 删除最早创建的会话
  const delKeys = validSessions.slice(0, validSessions.length - maxSession).map((item) => item.key);

  if (delKeys.length > 0) {
    await redis.del(delKeys);
  }
};

export const createUserSession = async ({
  userId,
  teamId,
  tmbId,
  isRoot,
  ip
}: {
  userId: string;
  teamId: string;
  tmbId: string;
  isRoot?: boolean;
  ip?: string | null;
}) => {
  const key = `${String(userId)}:${getNanoid(32)}`;

  await setSession({
    key,
    data: {
      userId: String(userId),
      teamId: String(teamId),
      tmbId: String(tmbId),
      isRoot,
      createdAt: new Date().getTime(),
      ip
    },
    expireSeconds: 7 * 24 * 60 * 60
  });

  delRedundantSession(userId);

  return key;
};

export const authUserSession = async (key: string): Promise<SessionType> => {
  const data = await getSession(key);
  return data;
};
