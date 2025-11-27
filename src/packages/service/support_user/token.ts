import jwt from 'jsonwebtoken';
import type { JwtPayloadType } from '../../global/support_user/type';
import { TOKEN_CONFIG } from '../../global/support_user/constants';

// 从环境变量获取密钥
const JWT_SECRET = process.env.TOKEN_KEY || 'fastgpt-default-secret';

/**
 * 生成 Access Token
 */
export function generateAccessToken(payload: Omit<JwtPayloadType, 'exp' | 'iat'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRES
  });
}

/**
 * 生成 Refresh Token
 */
export function generateRefreshToken(payload: Omit<JwtPayloadType, 'exp' | 'iat'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRES
  });
}

/**
 * 验证 Token
 */
export function verifyToken(token: string): JwtPayloadType {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadType;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token 已过期');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token 无效');
    }
    throw error;
  }
}

/**
 * 解析 Token (不验证过期时间)
 */
export function decodeToken(token: string): JwtPayloadType | null {
  try {
    const decoded = jwt.decode(token) as JwtPayloadType;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 从请求头获取 Token
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  // Bearer token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // fastgpt-xxx 格式的 API Key
  if (authHeader.startsWith('fastgpt-')) {
    return authHeader;
  }

  return authHeader;
}
