/**
 * Phase 5A - 找回密码 API 测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { hashPassword, verifyPassword } from '@fastgpt/service/support_user/auth/passwordUtils';

// 导入 API handler
import updatePasswordByCodeHandler from '@/api/support/user/account/password/updateByCode';

// Mock 验证码服务
vi.mock('@fastgpt/service/support_user/auth/verificationCodeService', () => ({
  verifyCode: vi.fn().mockResolvedValue(true)
}));

// Mock session 服务
vi.mock('@fastgpt/service/support_user/session', () => ({
  delUserAllSession: vi.fn().mockResolvedValue(undefined)
}));

import { verifyCode } from '@fastgpt/service/support_user/auth/verificationCodeService';
import { delUserAllSession } from '@fastgpt/service/support_user/session';

// 辅助函数：创建测试用户
async function createTestUser(data: {
  username: string;
  phone?: string;
  email?: string;
  password: string;
}) {
  const hashedPassword = hashPassword(data.password);
  return MongoUserModel.create({
    username: data.username,
    phone: data.phone,
    email: data.email?.toLowerCase(),
    password: hashedPassword,
    status: 'active'
  });
}

describe('Phase 5A - POST /api/support/user/account/password/updateByCode', () => {
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
    it('缺少 contact 应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('缺少 code 应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码');
    });

    it('缺少 newPassword 应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('密码');
    });

    it('无效的联系方式应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: 'invalid',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('手机号或邮箱');
    });

    it('新密码强度不足应返回错误', async () => {
      await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456',
          newPassword: '123456'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('密码');
    });

    it('GET 方法应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'GET'
      });

      expectError(response);
    });
  });

  describe('验证码验证', () => {
    it('验证码错误应返回错误', async () => {
      await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      vi.mocked(verifyCode).mockResolvedValueOnce(false);

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '000000',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码');
    });

    it('验证码过期应返回错误', async () => {
      await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      vi.mocked(verifyCode).mockResolvedValueOnce(false);

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('验证码');
    });
  });

  describe('用户不存在', () => {
    it('未注册的手机号应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13900139000',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('用户不存在');
    });

    it('未注册的邮箱应返回错误', async () => {
      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: 'notexist@example.com',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      expectError(response);
      expect(response.body.message).toContain('用户不存在');
    });
  });

  describe('密码重置成功', () => {
    it('通过手机号重置密码应成功', async () => {
      await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('通过邮箱重置密码应成功', async () => {
      await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'OldPassword1'
      });

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: 'test@example.com',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('邮箱大小写应不敏感', async () => {
      await createTestUser({
        username: 'testuser',
        email: 'Test@Example.com',
        password: 'OldPassword1'
      });

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: 'TEST@EXAMPLE.COM',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('重置后密码应被更新', async () => {
      const user = await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      // 验证密码已更新（需要显式选择 password 字段）
      const updatedUser = await MongoUserModel.findById(user._id).select('+password');
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.password).toBeDefined();
      expect(verifyPassword('NewPassword1', updatedUser!.password!)).toBe(true);
      expect(verifyPassword('OldPassword1', updatedUser!.password!)).toBe(false);
    });

    it('重置后应清除所有会话', async () => {
      const user = await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      expect(delUserAllSession).toHaveBeenCalledWith(user._id.toString());
    });
  });

  describe('会话清除失败处理', () => {
    it('会话清除失败不应影响密码重置', async () => {
      await createTestUser({
        username: 'testuser',
        phone: '13800138000',
        password: 'OldPassword1'
      });

      // 模拟会话清除失败
      vi.mocked(delUserAllSession).mockRejectedValueOnce(new Error('Redis error'));

      const response = await callApi(updatePasswordByCodeHandler, {
        method: 'POST',
        body: {
          contact: '13800138000',
          code: '123456',
          newPassword: 'NewPassword1'
        }
      });

      // 密码重置仍应成功
      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });
  });
});
