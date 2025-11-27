import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader
} from '@fastgpt/service/support_user/token';
import { TOKEN_CONFIG } from '@fastgpt/global/support_user/constants';

describe('Token 工具函数增强测试', () => {
  const testPayload = {
    userId: 'test-user-id-123',
    teamId: 'test-team-id-456'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAccessToken 边界测试', () => {
    it('空 payload 应该能生成 token', () => {
      const token = generateAccessToken({});
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('超长 userId 应该被正确处理', () => {
      const longUserId = 'a'.repeat(1000);
      const token = generateAccessToken({ userId: longUserId });

      expect(token).toBeDefined();

      const decoded = decodeToken(token);
      expect(decoded?.userId).toBe(longUserId);
    });

    it('包含特殊字符的 payload 应该被正确处理', () => {
      const specialPayload = {
        userId: 'user-<script>alert(1)</script>',
        teamId: '团队-中文ID-123'
      };

      const token = generateAccessToken(specialPayload);
      const decoded = decodeToken(token);

      expect(decoded?.userId).toBe(specialPayload.userId);
      expect(decoded?.teamId).toBe(specialPayload.teamId);
    });

    it('包含 null 和 undefined 的 payload 应该被正确处理', () => {
      const payload = {
        userId: 'test-user',
        teamId: undefined as unknown as string,
        extra: null as unknown as string
      };

      const token = generateAccessToken(payload);
      const decoded = decodeToken(token);

      expect(decoded?.userId).toBe('test-user');
    });

    it('token 应该包含正确的过期时间', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRES_SECONDS;

      // 允许 5 秒误差
      expect(decoded?.exp).toBeGreaterThan(now);
      expect(decoded?.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  describe('generateRefreshToken 边界测试', () => {
    it('refresh token 应该比 access token 过期时间长', () => {
      const accessToken = generateAccessToken(testPayload);
      const refreshToken = generateRefreshToken(testPayload);

      const accessDecoded = decodeToken(accessToken);
      const refreshDecoded = decodeToken(refreshToken);

      expect(refreshDecoded?.exp).toBeGreaterThan(accessDecoded?.exp || 0);
    });

    it('refresh token 过期时间应该是 7 天', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = decodeToken(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRES_SECONDS;

      // 允许 5 秒误差
      expect(decoded?.exp).toBeGreaterThan(now);
      expect(decoded?.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  describe('verifyToken 安全测试', () => {
    it('应该拒绝 none 算法攻击', () => {
      // 尝试构造一个使用 none 算法的 token
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: 'hacker' })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      expect(() => verifyToken(noneToken)).toThrow();
    });

    it('应该拒绝篡改的 payload', () => {
      const token = generateAccessToken(testPayload);
      const parts = token.split('.');

      // 篡改 payload
      const tamperedPayload = Buffer.from(JSON.stringify({
        userId: 'hacker',
        exp: Math.floor(Date.now() / 1000) + 99999999
      })).toString('base64url');

      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => verifyToken(tamperedToken)).toThrow('Token 无效');
    });

    it('应该拒绝篡改的签名', () => {
      const token = generateAccessToken(testPayload);
      const parts = token.split('.');

      // 篡改签名
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid_signature`;

      expect(() => verifyToken(tamperedToken)).toThrow('Token 无效');
    });

    it('应该拒绝空字符串', () => {
      expect(() => verifyToken('')).toThrow();
    });

    it('应该拒绝只有空格的字符串', () => {
      expect(() => verifyToken('   ')).toThrow();
    });

    it('应该拒绝格式不完整的 token', () => {
      expect(() => verifyToken('header.payload')).toThrow();
      expect(() => verifyToken('header')).toThrow();
      expect(() => verifyToken('...')).toThrow();
    });

    it('应该拒绝包含非法 base64 字符的 token', () => {
      expect(() => verifyToken('a@b#c.d$e%f.g^h&i')).toThrow();
    });
  });

  describe('Token 过期测试', () => {
    it('刚生成的 token 应该有效', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('过期的 token 应该被拒绝', () => {
      // 使用 vi.useFakeTimers 模拟时间
      vi.useFakeTimers();

      const token = generateAccessToken(testPayload);

      // 快进 2 小时 (超过 access token 1 小时有效期)
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      expect(() => verifyToken(token)).toThrow('Token 已过期');

      vi.useRealTimers();
    });

    it('接近过期边界的 token 应该仍然有效', () => {
      vi.useFakeTimers();

      const token = generateAccessToken(testPayload);

      // 快进 59 分钟 (不到 1 小时)
      vi.advanceTimersByTime(59 * 60 * 1000);

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(testPayload.userId);

      vi.useRealTimers();
    });
  });

  describe('decodeToken 测试', () => {
    it('应该能解码有效 token 而不验证签名', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('应该能解码过期的 token', () => {
      vi.useFakeTimers();

      const token = generateAccessToken(testPayload);

      // 快进超过过期时间
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // verifyToken 会抛出错误
      expect(() => verifyToken(token)).toThrow();

      // 但 decodeToken 应该仍然能解码
      const decoded = decodeToken(token);
      expect(decoded?.userId).toBe(testPayload.userId);

      vi.useRealTimers();
    });

    it('应该对完全无效的字符串返回 null', () => {
      expect(decodeToken('not-a-jwt')).toBeNull();
      expect(decodeToken('')).toBeNull();
      expect(decodeToken('a.b')).toBeNull();
    });
  });

  describe('extractTokenFromHeader 测试', () => {
    it('应该正确提取 Bearer token', () => {
      expect(extractTokenFromHeader('Bearer abc123')).toBe('abc123');
      expect(extractTokenFromHeader('bearer abc123')).toBe('bearer abc123'); // 区分大小写
    });

    it('应该正确识别 fastgpt- 格式的 API Key', () => {
      expect(extractTokenFromHeader('fastgpt-abc123')).toBe('fastgpt-abc123');
      expect(extractTokenFromHeader('fastgpt-')).toBe('fastgpt-');
    });

    it('应该处理各种边界情况', () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader('   ')).toBe('   '); // 只有空格不是空
      expect(extractTokenFromHeader('Bearer ')).toBe(''); // Bearer 后没有 token
    });

    it('应该处理特殊格式', () => {
      expect(extractTokenFromHeader('Bearer Bearer token')).toBe('Bearer token');
      expect(extractTokenFromHeader('token')).toBe('token');
      expect(extractTokenFromHeader('Basic abc123')).toBe('Basic abc123'); // 不是 Bearer
    });
  });

  describe('并发测试', () => {
    it('并发生成的 token 应该都有效', async () => {
      const tokens = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          Promise.resolve(generateAccessToken({ userId: `user-${i}` }))
        )
      );

      // 所有 token 应该唯一
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);

      // 所有 token 应该可验证
      tokens.forEach((token, i) => {
        const decoded = verifyToken(token);
        expect(decoded.userId).toBe(`user-${i}`);
      });
    });

    it('并发验证同一个 token 应该都成功', async () => {
      const token = generateAccessToken(testPayload);

      const results = await Promise.all(
        Array.from({ length: 100 }, () =>
          Promise.resolve(verifyToken(token))
        )
      );

      results.forEach(decoded => {
        expect(decoded.userId).toBe(testPayload.userId);
      });
    });
  });

  describe('密钥相关测试', () => {
    it('不同密钥生成的 token 不能互相验证', () => {
      // 当前实现使用环境变量 TOKEN_KEY，这里模拟检测
      const token = generateAccessToken(testPayload);

      // 使用不同密钥签名的 token 应该验证失败
      const differentSecretToken = jwt.sign(testPayload, 'different-secret', { expiresIn: '1h' });

      // 用当前密钥验证不同密钥的 token 应该失败
      expect(() => verifyToken(differentSecretToken)).toThrow('Token 无效');
    });
  });

  describe('JWT 结构测试', () => {
    it('token 应该有正确的 JWT 结构', () => {
      const token = generateAccessToken(testPayload);
      const parts = token.split('.');

      expect(parts.length).toBe(3);

      // 解析 header
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      // 解析 payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload.userId).toBe(testPayload.userId);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });
  });

  describe('内存和性能测试', () => {
    it('生成大量 token 不应该导致内存泄漏', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 生成 10000 个 token
      for (let i = 0; i < 10000; i++) {
        generateAccessToken({ userId: `user-${i}` });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 内存增长应该在合理范围内 (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('token 生成应该足够快', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        generateAccessToken(testPayload);
      }

      const duration = performance.now() - start;

      // 1000 次生成应该在 1 秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('token 验证应该足够快', () => {
      const token = generateAccessToken(testPayload);

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        verifyToken(token);
      }

      const duration = performance.now() - start;

      // 1000 次验证应该在 1 秒内完成
      expect(duration).toBeLessThan(1000);
    });
  });
});
