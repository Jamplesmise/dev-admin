import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader
} from '@fastgpt/service/support_user/token';

describe('Token 工具函数测试', () => {
  const testPayload = {
    userId: 'test-user-id-123',
    teamId: 'test-team-id-456'
  };

  describe('generateAccessToken', () => {
    it('应该生成有效的 JWT token', () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT 格式: header.payload.signature
    });
  });

  describe('generateRefreshToken', () => {
    it('应该生成有效的 refresh token', () => {
      const token = generateRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyToken', () => {
    it('应该能验证有效的 token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.teamId).toBe(testPayload.teamId);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('应该对无效 token 抛出错误', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Token 无效');
    });

    it('应该对格式错误的 token 抛出错误', () => {
      expect(() => verifyToken('a.b.c')).toThrow('Token 无效');
    });
  });

  describe('decodeToken', () => {
    it('应该能解码有效的 token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('应该对无效 token 返回 null', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('应该从 Bearer 格式提取 token', () => {
      const token = extractTokenFromHeader('Bearer my-token-123');
      expect(token).toBe('my-token-123');
    });

    it('应该识别 fastgpt- 格式的 API Key', () => {
      const token = extractTokenFromHeader('fastgpt-abcdef123456');
      expect(token).toBe('fastgpt-abcdef123456');
    });

    it('应该对无前缀的 token 直接返回', () => {
      const token = extractTokenFromHeader('plain-token');
      expect(token).toBe('plain-token');
    });

    it('应该对空值返回 null', () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
    });
  });
});
