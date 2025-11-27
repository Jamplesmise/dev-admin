import type { NextApiRequest, NextApiResponse } from 'next';
import type { ApiRequestProps, AuthContext } from '../../type/next';
import { verifyToken, extractTokenFromHeader } from '../token';
import { MongoUserModel } from '../schema';

// Root Key 验证 (系统管理员操作)
const ROOT_KEY = process.env.ROOT_KEY;

/**
 * 认证中间件类型
 */
export type AuthMiddlewareOptions = {
  /** 是否必须认证 (默认 true) */
  required?: boolean;
  /** 是否允许 API Key (fastgpt-xxx 格式) */
  allowApiKey?: boolean;
  /** 是否允许 Root Key */
  allowRootKey?: boolean;
};

/**
 * 错误码定义
 */
export const AUTH_ERROR_CODES = {
  NO_TOKEN: 503001,
  INVALID_TOKEN: 503002,
  TOKEN_EXPIRED: 503003,
  USER_NOT_FOUND: 503004,
  USER_BANNED: 503005,
  PERMISSION_DENIED: 503006
} as const;

/**
 * 认证错误类
 */
export class AuthError extends Error {
  code: number;
  statusText: string;

  constructor(code: number, message: string, statusText: string = 'AuthError') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusText = statusText;
  }
}

/**
 * 创建认证中间件
 * 用于 beforeCallback 数组
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const { required = true, allowApiKey = true, allowRootKey = false } = options;

  return async function authMiddleware(
    req: NextApiRequest,
    _res: NextApiResponse
  ): Promise<void> {
    const apiReq = req as ApiRequestProps;
    const authHeader = req.headers.authorization;

    // 尝试从 cookie 获取 token
    const cookieToken = req.cookies?.token;
    const tokenSource = authHeader || cookieToken;

    // 没有任何认证信息
    if (!tokenSource) {
      if (required) {
        throw new AuthError(AUTH_ERROR_CODES.NO_TOKEN, '请先登录', 'Unauthorized');
      }
      return;
    }

    // 提取 token
    const token = extractTokenFromHeader(tokenSource);
    if (!token) {
      if (required) {
        throw new AuthError(AUTH_ERROR_CODES.NO_TOKEN, '请先登录', 'Unauthorized');
      }
      return;
    }

    // 检查是否是 Root Key
    if (allowRootKey && ROOT_KEY && token === ROOT_KEY) {
      apiReq.auth = {
        userId: 'root',
        isRoot: true
      };
      return;
    }

    // 检查是否是 API Key (fastgpt-xxx 格式)
    if (token.startsWith('fastgpt-')) {
      if (!allowApiKey) {
        throw new AuthError(AUTH_ERROR_CODES.PERMISSION_DENIED, '此接口不支持 API Key', 'Forbidden');
      }
      // TODO: 实现 API Key 验证逻辑
      // 当前先返回错误，等 API Key 模块完成后再实现
      throw new AuthError(AUTH_ERROR_CODES.INVALID_TOKEN, 'API Key 功能暂未实现', 'NotImplemented');
    }

    // JWT Token 验证
    try {
      const decoded = verifyToken(token);

      // 验证用户是否存在且有效
      const user = await MongoUserModel.findById(decoded.userId).lean();
      if (!user) {
        throw new AuthError(AUTH_ERROR_CODES.USER_NOT_FOUND, '用户不存在', 'NotFound');
      }
      if (user.status === 'banned') {
        throw new AuthError(AUTH_ERROR_CODES.USER_BANNED, '账号已被禁用', 'Forbidden');
      }

      // 注入认证信息到请求对象
      apiReq.auth = {
        userId: String(user._id),
        teamId: decoded.teamId,
        tmbId: decoded.tmbId,
        isRoot: false
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      // JWT 验证错误
      const errorMessage = error instanceof Error ? error.message : '认证失败';

      if (errorMessage.includes('过期')) {
        throw new AuthError(AUTH_ERROR_CODES.TOKEN_EXPIRED, 'Token 已过期，请重新登录', 'TokenExpired');
      }

      throw new AuthError(AUTH_ERROR_CODES.INVALID_TOKEN, 'Token 无效', 'InvalidToken');
    }
  };
}

/**
 * 预设的认证中间件
 */
export const authMiddleware = createAuthMiddleware({ required: true });
export const optionalAuthMiddleware = createAuthMiddleware({ required: false });
export const rootAuthMiddleware = createAuthMiddleware({ required: true, allowRootKey: true });

/**
 * 辅助函数: 获取已认证的用户 ID
 * 如果未认证会抛出错误
 */
export function getAuthUserId(req: ApiRequestProps): string {
  if (!req.auth?.userId) {
    throw new AuthError(AUTH_ERROR_CODES.NO_TOKEN, '请先登录', 'Unauthorized');
  }
  return req.auth.userId;
}

/**
 * 辅助函数: 获取认证信息 (可能为空)
 */
export function getAuth(req: ApiRequestProps): AuthContext | undefined {
  return req.auth;
}

/**
 * 辅助函数: 检查是否为 Root 用户
 */
export function isRootUser(req: ApiRequestProps): boolean {
  return req.auth?.isRoot === true;
}
