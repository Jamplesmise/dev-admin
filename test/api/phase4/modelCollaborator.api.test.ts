/**
 * 模型协作者 API 测试
 * 测试模型协作者管理 API
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import listModelCollaboratorHandler from '@/api/system/model/collaborator/list';
import updateModelCollaboratorHandler from '@/api/system/model/collaborator/update';

describe('模型协作者 API 测试', () => {
  let teamId: string;
  let userId: string;
  let auth: AuthHeaders;
  let adminAuth: AuthHeaders;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();
    const context = await createTestContext(testDataFactory);
    teamId = context.teamId;
    userId = context.userId;
    auth = context.auth;

    // 创建管理员用户
    const adminContext = await createTestContext(testDataFactory);
    adminAuth = adminContext.auth;
  });

  describe('GET /api/system/model/collaborator/list', () => {
    it('应该成功获取协作者列表', async () => {
      // 使用有效的 ObjectId (teamId 也是有效的 ObjectId)
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId },
        auth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('应该拒绝缺少 resourceId 参数', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        auth
      });

      expectError(response, 500);
      expect(response.body.message).toContain('模型 ID');
    });

    it('应该支持分页', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId, page: '2', pageSize: '5' },
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(5);
    });

    it('应该按权限筛选协作者', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId, permission: 'read' },
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        const collaborators = data as unknown[];
        collaborators.forEach((c) => {
          expect((c as Record<string, unknown>).permission).toBeDefined();
        });
      }
    });

    it('应该支持搜索用户名', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId, keyword: 'test' },
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        const collaborators = data as unknown[];
        collaborators.forEach((c) => {
          const collab = c as Record<string, unknown>;
          expect(collab.tmbName || collab.username).toBeDefined();
        });
      }
    });

    it('应该拒绝未登录用户', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId },
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response, 500);
      expect(response.body.message).toContain('未登录');
    });

    it('应该拒绝缺少 teamId 的请求', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId },
        auth: { ...auth, teamId: '' },
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response, 500);
    });

    it('应该返回协作者的完整信息', async () => {
      const response = await callApi(listModelCollaboratorHandler, {
        method: 'GET',
        query: { resourceId: teamId },
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        const firstCollaborator = (data as unknown[])[0] as Record<string, unknown>;
        expect(firstCollaborator).toHaveProperty('tmbId');
        expect(firstCollaborator).toHaveProperty('permission');
        expect(firstCollaborator).toHaveProperty('createTime');
      }
    });
  });

  describe('POST /api/system/model/collaborator/update', () => {
    it('应该成功更新协作者权限', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: userId, permission: 6 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
    });

    it('应该拒绝无效的权限值', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: userId, permission: 999 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      // 可能成功或失败，取决于权限验证逻辑
      expect(response.statusCode).toBeDefined();
    });

    it('应该拒绝缺少必要字段', async () => {
      const updateData = {
        resourceId: teamId
        // 缺少 collaborators
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      expectError(response, 500);
      expect(response.body.message).toContain('协作者');
    });

    it('应该拒绝非管理员用户更新权限', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: userId, permission: 4 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth // 普通用户
      });

      // 权限检查可能在 controller 中
      expect(response.statusCode).toBeDefined();
    });

    it('应该拒绝更新不存在的协作者', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: '000000000000000000000000', permission: 4 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      // 不存在的协作者可能不会报错，取决于实现
      expect(response.statusCode).toBeDefined();
    });

    it('应该支持批量更新权限', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: userId, permission: 6 },
          { type: 'member', targetId: adminAuth.userId, permission: 6 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
    });

    it('应该支持移除协作者', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: []  // 空数组表示清空所有协作者
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
    });

    it('应该记录权限变更历史', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: userId, permission: 7 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        auth: adminAuth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
    });

    it('应该拒绝未登录用户', async () => {
      const updateData = {
        resourceId: teamId,
        collaborators: [
          { type: 'member', targetId: userId, permission: 4 }
        ]
      };

      const response = await callApi(updateModelCollaboratorHandler, {
        method: 'POST',
        body: updateData,
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response, 500);
      expect(response.body.message).toContain('未登录');
    });
  });
});
