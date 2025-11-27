/**
 * 认证中间件
 *
 * 从 Cookie Token 或 Authorization Header 解析用户认证信息
 *
 * 测试模式：设置环境变量 TEST_MODE=true 可跳过认证，使用模拟数据
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { ApiRequestProps, AuthContext } from '../../type/next';
import * as Cookie from 'cookie';
import { authUserSession } from '../../support_user/session';

const TokenName = 'fastgpt_token';

/**
 * 测试模式的模拟认证信息
 * 当 TEST_MODE=true 时使用
 * 注意：使用有效的 MongoDB ObjectId 格式
 */
const TEST_AUTH: AuthContext = {
  userId: '507f1f77bcf86cd799439011',
  teamId: '507f1f77bcf86cd799439012',
  tmbId: '507f1f77bcf86cd799439013',
  isRoot: false
};

/**
 * 认证中间件 - 需要完整认证（teamId 必须）
 *
 * 支持认证方式:
 * 1. Cookie: fastgpt_token
 * 2. Header: token
 * 3. Authorization: Bearer {token}
 * 4. 测试模式: TEST_MODE=true 时跳过认证
 */
export const authMiddleware = async (
  req: NextApiRequest,
  _res: NextApiResponse
): Promise<void> => {
  const apiReq = req as ApiRequestProps;

  // 测试模式：跳过认证，使用模拟数据
  // 但如果请求头包含 x-test-skip-auth-mock: true，则执行真实认证逻辑（用于测试认证失败场景）
  if (process.env.TEST_MODE === 'true' && req.headers['x-test-skip-auth-mock'] !== 'true') {
    // 如果测试代码已经设置了 req.auth，使用测试代码的认证信息
    if (apiReq.auth && apiReq.auth.teamId) {
      return;
    }
    // 否则使用默认的测试认证信息
    apiReq.auth = { ...TEST_AUTH };
    return;
  }

  // 1. 从 Cookie 或 header 获取 token
  const cookies = Cookie.parse(req.headers.cookie || '');
  const headerToken = req.headers.token as string;
  const authHeader = req.headers.authorization as string;

  // DEBUG: 打印收到的认证信息
  console.log('[Auth Debug] Request URL:', req.url);
  console.log('[Auth Debug] Cookie header:', req.headers.cookie ? req.headers.cookie.substring(0, 100) + '...' : 'empty');
  console.log('[Auth Debug] Token header:', headerToken || 'empty');
  console.log('[Auth Debug] Authorization header:', authHeader ? authHeader.substring(0, 50) + '...' : 'empty');
  console.log('[Auth Debug] Parsed cookies:', Object.keys(cookies));

  const token =
    headerToken ||
    cookies[TokenName] ||
    (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');

  console.log('[Auth Debug] Final token:', token ? token.substring(0, 30) + '...' : 'empty');

  if (!token) {
    console.log('[Auth Debug] No token found, returning 401');
    throw new Error('未登录或登录已过期');
  }

  try {
    // 2. 从 Redis 获取 Session
    console.log('[Auth Debug] Querying Redis for session...');
    const session = await authUserSession(token);
    console.log('[Auth Debug] Session found:', session ? 'yes' : 'no');

    if (!session || !session.teamId) {
      console.log('[Auth Debug] Session invalid or missing teamId');
      throw new Error('未登录或登录已过期');
    }

    console.log('[Auth Debug] Session data:', JSON.stringify({ userId: session.userId, teamId: session.teamId, tmbId: session.tmbId }));

    // 3. 设置认证上下文
    apiReq.auth = {
      userId: session.userId,
      teamId: session.teamId,
      tmbId: session.tmbId,
      isRoot: session.isRoot || false
    };
    console.log('[Auth Debug] Authentication successful!');
  } catch (error) {
    console.error('[Auth Debug] Authentication failed:', error);
    throw new Error('未登录或登录已过期');
  }
};

/**
 * 可选认证中间件 - teamId 可选
 *
 * 用于不强制要求登录的接口
 */
export const optionalAuthMiddleware = async (
  req: NextApiRequest,
  _res: NextApiResponse
): Promise<void> => {
  const apiReq = req as ApiRequestProps;

  // 从 Cookie 或 header 获取 token
  const cookies = Cookie.parse(req.headers.cookie || '');
  const headerToken = req.headers.token as string;
  const authHeader = req.headers.authorization as string;

  const token =
    headerToken ||
    cookies[TokenName] ||
    (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');

  if (token) {
    try {
      const session = await authUserSession(token);
      if (session && session.teamId) {
        apiReq.auth = {
          userId: session.userId,
          teamId: session.teamId,
          tmbId: session.tmbId,
          isRoot: session.isRoot || false
        };
      }
    } catch (error) {
      // 可选认证，忽略错误
      console.debug('Optional auth failed:', error);
    }
  }
};

/**
 * 获取认证信息（带默认值）
 */
export function getAuthFromReq(req: ApiRequestProps): AuthContext {
  if (!req.auth) {
    throw new Error('认证信息不存在，请确保已使用 authMiddleware');
  }
  return req.auth;
}

/**
 * 获取 teamId（必须存在）
 */
export function getTeamIdFromReq(req: ApiRequestProps): string {
  const auth = getAuthFromReq(req);
  if (!auth.teamId) {
    throw new Error('缺少 teamId');
  }
  return auth.teamId;
}

/**
 * 获取 tmbId（必须存在）
 */
export function getTmbIdFromReq(req: ApiRequestProps): string {
  const auth = getAuthFromReq(req);
  if (!auth.tmbId) {
    throw new Error('缺少 tmbId');
  }
  return auth.tmbId;
}

/**
 * 获取 userId（必须存在）
 */
export function getUserIdFromReq(req: ApiRequestProps): string {
  const auth = getAuthFromReq(req);
  if (!auth.userId) {
    throw new Error('缺少 userId');
  }
  return auth.userId;
}

/**
 * 团队成员名称查询（占位版本）
 * TODO: 替换为真实 TeamMember 查询
 */
export async function getTeamMemberInfo(tmbId: string): Promise<{
  name: string;
  avatar?: string;
}> {
  // 占位实现：返回默认值
  return {
    name: `成员_${tmbId.slice(-4)}`,
    avatar: undefined
  };
}
