/**
 * Phase 5A - 用户注册 API 测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';

// 导入 API handler
import registerHandler from '@/api/support/user/account/register/emailAndPhone';

// Mock 验证码服务
vi.mock('@fastgpt/service/support_user/auth/verificationCodeService', () => ({
  verifyCode: vi.fn().mockResolvedValue(true)
}));

// Mock session 服务
vi.mock('@fastgpt/service/support_user/session', () => ({
  createUserSession: vi.fn().mockResolvedValue('mock-session-key-123')
}));

import { verifyCode } from '@fastgpt/service/support_user/auth/verificationCodeService';
import { createUserSession } from '@fastgpt/service/support_user/session';

describe('Phase 5A - POST /api/support/user/account/register/emailAndPhone', () => {
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
    it('缺少 username 应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('用户名');
    });

    it('用户名太短应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'a',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('用户名');
    });

    it('用户名太长应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'a'.repeat(51),
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('用户名');
    });

    it('缺少 password 应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('密码');
    });

    it('密码强度不足应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: '123456',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('密码');
    });

    it('缺少 contact 应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('无效的联系方式应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: 'invalid',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('缺少 code 应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码');
    });

    it('GET 方法应返回错误', async () => {
      const response = await callApi(registerHandler, {
        method: 'GET'
      });

      expectError(response);
    });
  });

  describe('验证码验证', () => {
    it('验证码错误应返回错误', async () => {
      vi.mocked(verifyCode).mockResolvedValueOnce(false);

      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '000000'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码');
    });

    it('验证码过期应返回错误', async () => {
      vi.mocked(verifyCode).mockResolvedValueOnce(false);

      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码');
    });
  });

  describe('注册成功', () => {
    it('手机号注册应成功', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      const data = expectSuccess<{
        user: { _id: string; username: string; avatar: string };
        token: string;
      }>(response);

      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testuser');
      expect(data.user._id).toBeDefined();
      expect(data.token).toBe('mock-session-key-123');
    });

    it('邮箱注册应成功', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: 'test@example.com',
          code: '123456'
        }
      });

      const data = expectSuccess<{
        user: { _id: string; username: string };
        token: string;
      }>(response);

      expect(data.user.username).toBe('testuser');
      expect(data.token).toBeDefined();
    });

    it('应创建用户会话', async () => {
      await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      expect(createUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          teamId: expect.any(String),
          tmbId: expect.any(String)
        })
      );
    });
  });

  describe('重复注册', () => {
    it('手机号已注册应返回错误', async () => {
      // 先注册一个用户
      await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'existinguser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      // 用同一手机号再次注册
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'newuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('已注册');
    });

    it('邮箱已注册应返回错误', async () => {
      // 先注册一个用户
      await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'existinguser',
          password: 'Test1234',
          contact: 'test@example.com',
          code: '123456'
        }
      });

      // 用同一邮箱再次注册
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'newuser',
          password: 'Test1234',
          contact: 'test@example.com',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('已注册');
    });

    it('用户名已存在应返回错误', async () => {
      // 先注册一个用户
      await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        }
      });

      // 用同一用户名再次注册
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138001',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('用户名');
    });
  });

  describe('邀请注册', () => {
    it('带邀请人 ID 注册应成功', async () => {
      const inviter = await testDataFactory.createUser({ username: 'inviter' });

      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456',
          inviterId: inviter._id.toString()
        }
      });

      expectSuccess(response);
    });

    it('无效邀请人 ID 不影响注册', async () => {
      const response = await callApi(registerHandler, {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456',
          inviterId: '507f1f77bcf86cd799439011'
        }
      });

      expectSuccess(response);
    });
  });
});
