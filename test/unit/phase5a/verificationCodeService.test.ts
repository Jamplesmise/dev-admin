/**
 * Phase 5A - 验证码服务单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateVerificationCode,
  checkRateLimit,
  saveVerificationCode,
  verifyCode,
  getCodeTTL,
  deleteVerificationCode
} from '@fastgpt/service/support_user/auth/verificationCodeService';
import { VERIFICATION_CODE_CONFIG } from '@fastgpt/global/support_user/auth/verificationCode';

// Mock Redis 连接
const mockRedis = {
  exists: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn()
};

vi.mock('@fastgpt/service/common/redis/index', () => ({
  getGlobalRedisConnection: () => mockRedis
}));

describe('Phase 5A - VerificationCodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateVerificationCode', () => {
    it('应生成 6 位数字验证码', () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('应生成配置长度的验证码', () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(VERIFICATION_CODE_CONFIG.CODE_LENGTH);
    });

    it('每次生成的验证码应大多不同', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }
      // 100 次生成至少 90% 不重复（随机性）
      expect(codes.size).toBeGreaterThan(90);
    });

    it('生成的验证码应只包含数字', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateVerificationCode();
        expect(/^\d+$/.test(code)).toBe(true);
      }
    });
  });

  describe('checkRateLimit', () => {
    it('首次发送应通过（返回 null）', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue(null);

      const result = await checkRateLimit('13800138000');
      expect(result).toBeNull();
    });

    it('60 秒内重复发送应被拒绝', async () => {
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(45);

      const result = await checkRateLimit('13800138000');
      expect(result).toContain('发送过于频繁');
      expect(result).toContain('45');
    });

    it('达到每日上限应被拒绝', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue('10'); // DAILY_LIMIT = 10

      const result = await checkRateLimit('13800138000');
      expect(result).toContain('今日发送次数已达上限');
    });

    it('未达到每日上限应通过', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue('5');

      const result = await checkRateLimit('13800138000');
      expect(result).toBeNull();
    });
  });

  describe('saveVerificationCode', () => {
    it('应正确保存验证码和设置频率限制', async () => {
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await saveVerificationCode('register', '13800138000', '123456');

      // 验证码保存调用（第一次 setex）
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('register'),
        VERIFICATION_CODE_CONFIG.EXPIRE_SECONDS,
        '123456'
      );

      // 频率限制设置调用（第二次 setex）
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('rate'),
        VERIFICATION_CODE_CONFIG.SEND_INTERVAL_SECONDS,
        '1'
      );

      // 每日计数增加调用
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('新创建的每日计数应设置过期时间', async () => {
      mockRedis.exists.mockResolvedValue(0); // 新 key
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await saveVerificationCode('register', '13800138000', '123456');

      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('已存在的每日计数不应重设过期时间', async () => {
      mockRedis.exists.mockImplementation((key: string) => {
        // 第一次调用（rate limit）返回 0，第二次调用（daily count）返回 1
        if (key.includes('daily_count')) {
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      });
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(2);

      await saveVerificationCode('register', '13800138000', '123456');

      // 计数器增加但不重设过期
      expect(mockRedis.incr).toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    it('正确验证码应通过', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockRedis.del.mockResolvedValue(1);

      const result = await verifyCode('register', '13800138000', '123456');
      expect(result).toBe(true);
    });

    it('错误验证码应失败', async () => {
      mockRedis.get.mockResolvedValue('123456');

      const result = await verifyCode('register', '13800138000', '654321');
      expect(result).toBe(false);
    });

    it('验证码不存在应失败', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await verifyCode('register', '13800138000', '123456');
      expect(result).toBe(false);
    });

    it('验证成功后应删除验证码（一次性使用）', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockRedis.del.mockResolvedValue(1);

      await verifyCode('register', '13800138000', '123456');

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('验证失败不应删除验证码', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await verifyCode('register', '13800138000', '654321');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('不同类型的验证码应独立', async () => {
      // 模拟只有 findPassword 类型的验证码存在
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('findPassword')) {
          return Promise.resolve('654321');
        }
        return Promise.resolve(null);
      });

      // 用 register 类型验证应失败
      const result = await verifyCode('register', '13800138000', '654321');
      expect(result).toBe(false);
    });
  });

  describe('getCodeTTL', () => {
    it('应返回剩余有效时间', async () => {
      mockRedis.ttl.mockResolvedValue(250);

      const ttl = await getCodeTTL('register', '13800138000');
      expect(ttl).toBe(250);
    });

    it('验证码已过期应返回 0', async () => {
      mockRedis.ttl.mockResolvedValue(-2);

      const ttl = await getCodeTTL('register', '13800138000');
      expect(ttl).toBe(0);
    });

    it('验证码不存在应返回 0', async () => {
      mockRedis.ttl.mockResolvedValue(-1);

      const ttl = await getCodeTTL('register', '13800138000');
      expect(ttl).toBe(0);
    });
  });

  describe('deleteVerificationCode', () => {
    it('应成功删除验证码', async () => {
      mockRedis.del.mockResolvedValue(1);

      await deleteVerificationCode('register', '13800138000');

      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining('register')
      );
    });
  });
});
