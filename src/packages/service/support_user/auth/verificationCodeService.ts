/**
 * 验证码服务
 * 基于 Redis 实现验证码的生成、存储、验证和频率限制
 */

import { getGlobalRedisConnection } from '../../common/redis/index';
import {
  VerificationCodeType,
  VERIFICATION_CODE_CONFIG,
  VERIFICATION_CODE_REDIS_KEYS
} from '@fastgpt/global/support_user/auth/verificationCode';

/**
 * 生成随机验证码
 */
export function generateVerificationCode(): string {
  const length = VERIFICATION_CODE_CONFIG.CODE_LENGTH;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * 获取 Redis Key
 */
function getCodeKey(type: VerificationCodeType, contact: string): string {
  return `${VERIFICATION_CODE_REDIS_KEYS.CODE}:${type}:${contact}`;
}

function getRateLimitKey(contact: string): string {
  return `${VERIFICATION_CODE_REDIS_KEYS.RATE_LIMIT}:${contact}`;
}

function getDailyCountKey(contact: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${VERIFICATION_CODE_REDIS_KEYS.DAILY_COUNT}:${contact}:${today}`;
}

/**
 * 检查发送频率限制
 * @returns 如果可以发送返回 null，否则返回错误信息
 */
export async function checkRateLimit(contact: string): Promise<string | null> {
  const redis = getGlobalRedisConnection();

  // 1. 检查 60 秒内是否已发送
  const rateLimitKey = getRateLimitKey(contact);
  const rateLimitExists = await redis.exists(rateLimitKey);

  if (rateLimitExists) {
    const ttl = await redis.ttl(rateLimitKey);
    return `发送过于频繁，请 ${ttl} 秒后再试`;
  }

  // 2. 检查每日发送次数
  const dailyCountKey = getDailyCountKey(contact);
  const dailyCount = await redis.get(dailyCountKey);
  const count = dailyCount ? parseInt(dailyCount, 10) : 0;

  if (count >= VERIFICATION_CODE_CONFIG.DAILY_LIMIT) {
    return '今日发送次数已达上限，请明天再试';
  }

  return null;
}

/**
 * 保存验证码并设置频率限制
 */
export async function saveVerificationCode(
  type: VerificationCodeType,
  contact: string,
  code: string
): Promise<void> {
  const redis = getGlobalRedisConnection();

  // 1. 保存验证码
  const codeKey = getCodeKey(type, contact);
  await redis.setex(codeKey, VERIFICATION_CODE_CONFIG.EXPIRE_SECONDS, code);

  // 2. 设置发送频率限制
  const rateLimitKey = getRateLimitKey(contact);
  await redis.setex(rateLimitKey, VERIFICATION_CODE_CONFIG.SEND_INTERVAL_SECONDS, '1');

  // 3. 增加每日发送计数
  const dailyCountKey = getDailyCountKey(contact);
  const exists = await redis.exists(dailyCountKey);
  await redis.incr(dailyCountKey);

  // 如果是新创建的 key，设置过期时间为当天结束
  if (!exists) {
    // 计算到当天结束的秒数
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const secondsUntilEndOfDay = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000);
    await redis.expire(dailyCountKey, secondsUntilEndOfDay);
  }
}

/**
 * 验证验证码
 * @returns 验证成功返回 true，失败返回 false
 */
export async function verifyCode(
  type: VerificationCodeType,
  contact: string,
  code: string
): Promise<boolean> {
  const redis = getGlobalRedisConnection();
  const codeKey = getCodeKey(type, contact);

  const storedCode = await redis.get(codeKey);

  if (!storedCode) {
    return false; // 验证码不存在或已过期
  }

  if (storedCode !== code) {
    return false; // 验证码不匹配
  }

  // 验证成功后删除验证码（一次性使用）
  await redis.del(codeKey);

  return true;
}

/**
 * 删除验证码（手动清除）
 */
export async function deleteVerificationCode(
  type: VerificationCodeType,
  contact: string
): Promise<void> {
  const redis = getGlobalRedisConnection();
  const codeKey = getCodeKey(type, contact);
  await redis.del(codeKey);
}

/**
 * 获取验证码剩余有效时间（秒）
 */
export async function getCodeTTL(
  type: VerificationCodeType,
  contact: string
): Promise<number> {
  const redis = getGlobalRedisConnection();
  const codeKey = getCodeKey(type, contact);
  const ttl = await redis.ttl(codeKey);
  return ttl > 0 ? ttl : 0;
}
