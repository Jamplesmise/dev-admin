import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createAuthMiddleware,
  AuthError,
  AUTH_ERROR_CODES,
  getAuthUserId,
  isRootUser
} from '@fastgpt/service/support_user/auth/middleware';
import { generateAccessToken } from '@fastgpt/service/support_user/token';
import type { ApiRequestProps } from '@fastgpt/service/type/next';

// Mock MongoUserModel
vi.mock('@fastgpt/service/support_user/schema', () => ({
  MongoUserModel: {
    findById: vi.fn()
  }
}));

import { MongoUserModel } from '@fastgpt/service/support_user/schema';

describe('认证中间件测试', () => {
  const mockRes = {} as NextApiResponse;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuthMiddleware', () => {
    it('应该在没有 token 时对 required=true 抛出错误', async () => {
      const middleware = createAuthMiddleware({ required: true });
      const mockReq = {
        headers: {},
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).rejects.toThrow(AuthError);
      await expect(middleware(mockReq, mockRes)).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.NO_TOKEN
      });
    });

    it('应该在没有 token 时对 required=false 正常通过', async () => {
      const middleware = createAuthMiddleware({ required: false });
      const mockReq = {
        headers: {},
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).resolves.toBeUndefined();
    });

    it('应该正确验证有效的 JWT token', async () => {
      const userId = 'test-user-123';
      const token = generateAccessToken({ userId });

      // Mock 用户查询
      (MongoUserModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
        lean: () => Promise.resolve({ _id: userId, status: 'active' })
      });

      const middleware = createAuthMiddleware({ required: true });
      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {}
      } as unknown as ApiRequestProps;

      await middleware(mockReq as NextApiRequest, mockRes);

      expect(mockReq.auth).toBeDefined();
      expect(mockReq.auth?.userId).toBe(userId);
      expect(mockReq.auth?.isRoot).toBe(false);
    });

    it('应该对无效 token 抛出错误', async () => {
      const middleware = createAuthMiddleware({ required: true });
      const mockReq = {
        headers: { authorization: 'Bearer invalid-token' },
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INVALID_TOKEN
      });
    });

    it('应该对被禁用用户抛出错误', async () => {
      const userId = 'banned-user-123';
      const token = generateAccessToken({ userId });

      (MongoUserModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
        lean: () => Promise.resolve({ _id: userId, status: 'banned' })
      });

      const middleware = createAuthMiddleware({ required: true });
      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.USER_BANNED
      });
    });

    it('应该对不存在用户抛出错误', async () => {
      const userId = 'nonexistent-user';
      const token = generateAccessToken({ userId });

      (MongoUserModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
        lean: () => Promise.resolve(null)
      });

      const middleware = createAuthMiddleware({ required: true });
      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.USER_NOT_FOUND
      });
    });

    it('应该支持从 cookie 获取 token', async () => {
      const userId = 'cookie-user-123';
      const token = generateAccessToken({ userId });

      (MongoUserModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
        lean: () => Promise.resolve({ _id: userId, status: 'active' })
      });

      const middleware = createAuthMiddleware({ required: true });
      const mockReq = {
        headers: {},
        cookies: { token }
      } as unknown as ApiRequestProps;

      await middleware(mockReq as NextApiRequest, mockRes);

      expect(mockReq.auth?.userId).toBe(userId);
    });

    it('应该识别 API Key 格式但暂时返回未实现', async () => {
      const middleware = createAuthMiddleware({ required: true, allowApiKey: true });
      const mockReq = {
        headers: { authorization: 'fastgpt-abcdef123456' },
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).rejects.toThrow('API Key 功能暂未实现');
    });

    it('应该在不允许 API Key 时拒绝 API Key', async () => {
      const middleware = createAuthMiddleware({ required: true, allowApiKey: false });
      const mockReq = {
        headers: { authorization: 'fastgpt-abcdef123456' },
        cookies: {}
      } as unknown as NextApiRequest;

      await expect(middleware(mockReq, mockRes)).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.PERMISSION_DENIED
      });
    });
  });

  describe('辅助函数', () => {
    it('getAuthUserId 应该返回已认证用户的 ID', () => {
      const mockReq = {
        auth: { userId: 'test-123', isRoot: false }
      } as ApiRequestProps;

      expect(getAuthUserId(mockReq)).toBe('test-123');
    });

    it('getAuthUserId 应该在未认证时抛出错误', () => {
      const mockReq = {} as ApiRequestProps;

      expect(() => getAuthUserId(mockReq)).toThrow(AuthError);
    });

    it('isRootUser 应该正确识别 root 用户', () => {
      const rootReq = { auth: { userId: 'root', isRoot: true } } as ApiRequestProps;
      const normalReq = { auth: { userId: 'user-123', isRoot: false } } as ApiRequestProps;
      const noAuthReq = {} as ApiRequestProps;

      expect(isRootUser(rootReq)).toBe(true);
      expect(isRootUser(normalReq)).toBe(false);
      expect(isRootUser(noAuthReq)).toBe(false);
    });
  });
});
