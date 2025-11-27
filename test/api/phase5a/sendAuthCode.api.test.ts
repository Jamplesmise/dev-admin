/**
 * Phase 5A - 发送验证码 API 测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';

// 导入 API handler
import sendAuthCodeHandler from '@/api/support/user/inform/sendAuthCode';

// Mock 验证码服务
vi.mock('@fastgpt/service/support_user/auth/verificationCodeService', () => ({
  generateVerificationCode: () => '123456',
  checkRateLimit: vi.fn().mockResolvedValue(null),
  saveVerificationCode: vi.fn().mockResolvedValue(undefined),
  verifyCode: vi.fn().mockResolvedValue(true)
}));

// Mock 通知服务
vi.mock('@fastgpt/service/support_user/notification', async (importOriginal) => {
  const original = await importOriginal<typeof import('@fastgpt/service/support_user/notification')>();
  return {
    ...original,
    sendVerificationCode: vi.fn().mockResolvedValue(undefined)
  };
});

// 获取 mock 函数引用
import { checkRateLimit, saveVerificationCode } from '@fastgpt/service/support_user/auth/verificationCodeService';
import { sendVerificationCode } from '@fastgpt/service/support_user/notification';

describe('Phase 5A - POST /api/support/user/inform/sendAuthCode', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearAllTestCollections();
  });

  describe('参数验证', () => {
    it('缺少 type 应返回错误', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { contact: '13800138000' }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码类型');
    });

    it('缺少 contact 应返回错误', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register' }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('无效的 type 应返回错误', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'invalid', contact: '13800138000' }
      });

      expectError(response);
    });

    it('无效的手机号应返回错误', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '1234567890' }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('无效的邮箱应返回错误', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: 'invalid-email' }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('GET 方法应返回错误', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'GET',
        body: { type: 'register', contact: '13800138000' }
      });

      expectError(response);
    });
  });

  describe('验证码类型', () => {
    it('register 类型应成功', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      const data = expectSuccess<{ success: boolean; expireTime: number }>(response);
      expect(data.success).toBe(true);
      expect(data.expireTime).toBe(300);
    });

    it('findPassword 类型应成功', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'findPassword', contact: '13800138000' }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('bindPhone 类型应成功', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'bindPhone', contact: '13800138000' }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('bindEmail 类型应成功', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'bindEmail', contact: 'test@example.com' }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });
  });

  describe('联系方式类型', () => {
    it('手机号应成功发送', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      expectSuccess(response);
      expect(sendVerificationCode).toHaveBeenCalledWith('13800138000', '123456');
    });

    it('邮箱应成功发送', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: 'test@example.com' }
      });

      expectSuccess(response);
      expect(sendVerificationCode).toHaveBeenCalledWith('test@example.com', '123456');
    });
  });

  describe('频率限制', () => {
    it('首次发送应成功', async () => {
      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      const data = expectSuccess<{ success: boolean; expireTime: number }>(response);
      expect(data.success).toBe(true);
    });

    it('60 秒内重复发送应返回错误', async () => {
      // 模拟频率限制
      vi.mocked(checkRateLimit).mockResolvedValueOnce('发送过于频繁，请 45 秒后再试');

      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      expectError(response);
      expect(response.body.message).toContain('频繁');
    });

    it('达到每日上限应返回错误', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce('今日发送次数已达上限，请明天再试');

      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      expectError(response);
      expect(response.body.message).toContain('上限');
    });
  });

  describe('验证码保存', () => {
    it('应调用 saveVerificationCode', async () => {
      await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      expect(saveVerificationCode).toHaveBeenCalledWith('register', '13800138000', '123456');
    });
  });

  describe('发送失败处理', () => {
    it('发送失败应返回错误', async () => {
      vi.mocked(sendVerificationCode).mockRejectedValueOnce(new Error('SMS service error'));

      const response = await callApi(sendAuthCodeHandler, {
        method: 'POST',
        body: { type: 'register', contact: '13800138000' }
      });

      expectError(response);
      expect(response.body.message).toContain('发送失败');
    });
  });
});
