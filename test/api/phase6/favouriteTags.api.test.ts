/**
 * 收藏标签 API 集成测试
 * 测试 Phase 6C 收藏标签相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import tagsHandler from '@/api/core/chat/setting/favourite/tags';

describe('收藏标签 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
  let auth: AuthHeaders;
  let appId: string;
  let favouriteId: string;

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
    tmbId = context.tmbId;
    userId = context.userId;
    auth = context.auth;

    // 创建测试应用
    const app = await testDataFactory.createApp({
      teamId,
      tmbId,
      name: '测试应用'
    });
    appId = app._id.toString();

    // 创建收藏
    const favourite = await testDataFactory.createFavouriteApp({
      teamId,
      tmbId,
      appId,
      tags: ['原有标签']
    });
    favouriteId = favourite._id.toString();
  });

  describe('PUT /api/core/chat/setting/favourite/tags', () => {
    it('应该成功更新收藏标签', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId,
          tags: ['工作', '常用', '重要']
        }
      });

      const data = expectSuccess<{ tags: string[] }>(response);
      expect(data.tags).toHaveLength(3);
      expect(data.tags).toContain('工作');
      expect(data.tags).toContain('常用');
      expect(data.tags).toContain('重要');
    });

    it('应该成功清空标签', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId,
          tags: []
        }
      });

      const data = expectSuccess<{ tags: string[] }>(response);
      expect(data.tags).toHaveLength(0);
    });

    it('标签数量超过限制应该返回错误', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId,
          tags: ['标签1', '标签2', '标签3', '标签4', '标签5', '标签6'] // 超过 5 个
        }
      });

      expectError(response);
    });

    it('单个标签超过长度限制应该返回错误', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId,
          tags: ['这是一个非常非常非常非常非常非常长的标签名称'] // 超过 20 字符
        }
      });

      expectError(response);
    });

    it('收藏不存在应该返回错误', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId: '507f1f77bcf86cd799439011',
          tags: ['标签']
        }
      });

      expectError(response);
    });

    it('其他用户的收藏无法更新', async () => {
      // 创建另一个用户的收藏
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });
      const favourite2 = await testDataFactory.createFavouriteApp({
        teamId,
        tmbId: member2._id.toString(),
        appId
      });

      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId: favourite2._id.toString(),
          tags: ['标签']
        }
      });

      expectError(response);
    });

    it('缺少 favouriteId 应该返回错误', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          tags: ['标签']
        }
      });

      expectError(response);
    });

    it('tags 不是数组应该返回错误', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        auth,
        body: {
          favouriteId,
          tags: '标签' as unknown as string[]
        }
      });

      expectError(response);
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(tagsHandler, {
        method: 'PUT',
        skipAuthMock: true,
        body: {
          favouriteId,
          tags: ['标签']
        }
      });

      expectError(response);
    });

  });
});
