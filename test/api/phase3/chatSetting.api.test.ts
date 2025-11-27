/**
 * 聊天设置 API 集成测试
 * 测试所有 ChatSetting 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import detailHandler from '@/api/core/chat/setting/detail';
import updateHandler from '@/api/core/chat/setting/update';
import favouriteListHandler from '@/api/core/chat/setting/favourite/list';
import favouriteUpdateHandler from '@/api/core/chat/setting/favourite/update';
import favouriteOrderHandler from '@/api/core/chat/setting/favourite/order';
import favouriteTagsHandler from '@/api/core/chat/setting/favourite/tags';
import favouriteDeleteHandler from '@/api/core/chat/setting/favourite/delete';

describe('聊天设置 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let auth: AuthHeaders;

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
    auth = context.auth;
  });

  describe('GET /api/core/chat/setting/detail', () => {
    it('应该返回默认设置（首次获取时自动创建）', async () => {
      const response = await callApi(detailHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
      expect(data.homeEnabled).toBe(false);
      expect(data.sidebarCollapsed).toBe(false);
      expect(data.preferences).toBeDefined();
      expect(data.preferences.theme).toBe('system');
      expect(data.preferences.fontSize).toBe(14);
    });

    it('应该返回已保存的设置（已存在时）', async () => {
      // 先创建设置
      await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          homeEnabled: true,
          homeWelcome: '自定义欢迎语',
          preferences: {
            theme: 'dark',
            fontSize: 16
          }
        }
      });

      // 再获取设置
      const response = await callApi(detailHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.homeEnabled).toBe(true);
      expect(data.homeWelcome).toBe('自定义欢迎语');
      expect(data.preferences.theme).toBe('dark');
      expect(data.preferences.fontSize).toBe(16);
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(detailHandler, {
        method: 'GET',
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response);
    });
  });

  describe('POST /api/core/chat/setting/update', () => {
    it('应该成功更新首页设置', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          homeEnabled: true,
          homeWelcome: '欢迎使用 FastGPT！'
        }
      });

      const data = expectSuccess(response);
      expect(data.homeEnabled).toBe(true);
      expect(data.homeWelcome).toBe('欢迎使用 FastGPT！');
    });

    it('应该成功更新侧边栏折叠状态', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          sidebarCollapsed: true
        }
      });

      const data = expectSuccess(response);
      expect(data.sidebarCollapsed).toBe(true);
    });

    it('应该成功更新偏好设置', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          preferences: {
            theme: 'dark',
            fontSize: 16,
            codeTheme: 'monokai'
          }
        }
      });

      const data = expectSuccess(response);
      expect(data.preferences.theme).toBe('dark');
      expect(data.preferences.fontSize).toBe(16);
      expect(data.preferences.codeTheme).toBe('monokai');
    });

    it('欢迎语超长应该返回错误', async () => {
      const longWelcome = 'a'.repeat(501);
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          homeWelcome: longWelcome
        }
      });

      expectError(response);
    });

    it('字体大小超出上限应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          preferences: {
            fontSize: 30
          }
        }
      });

      expectError(response);
    });

    it('字体大小超出下限应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          preferences: {
            fontSize: 10
          }
        }
      });

      expectError(response);
    });

    it('无效主题应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          preferences: {
            theme: 'invalid' as 'light' | 'dark' | 'system'
          }
        }
      });

      expectError(response);
    });
  });

  describe('收藏应用功能', () => {
    let appId: string;

    beforeEach(async () => {
      // 创建测试应用
      const app = await testDataFactory.createApp({ teamId, name: '测试应用' });
      appId = app._id.toString();
    });

    describe('GET /api/core/chat/setting/favourite/list', () => {
      it('应该返回空列表当没有收藏时', async () => {
        const response = await callApi(favouriteListHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });

      it('应该返回收藏列表', async () => {
        // 创建收藏
        await testDataFactory.createFavouriteApp({ teamId, tmbId, appId });

        const response = await callApi(favouriteListHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(1);
        expect(data[0].appId).toBe(appId);
      });
    });

    describe('POST /api/core/chat/setting/favourite/update', () => {
      it('应该成功添加收藏', async () => {
        const response = await callApi(favouriteUpdateHandler, {
          method: 'POST',
          auth,
          body: {
            appId,
            customName: '我的应用',
            tags: ['工作', '常用']
          }
        });

        const data = expectSuccess(response);
        expect(data.appId).toBe(appId);
        expect(data.customName).toBe('我的应用');
        expect(data.tags).toContain('工作');
      });

      it('重复收藏应该更新而非创建新记录', async () => {
        // 第一次收藏
        await callApi(favouriteUpdateHandler, {
          method: 'POST',
          auth,
          body: { appId }
        });

        // 第二次收藏（更新）
        const response = await callApi(favouriteUpdateHandler, {
          method: 'POST',
          auth,
          body: {
            appId,
            customName: '新名称'
          }
        });

        const data = expectSuccess(response);
        expect(data.customName).toBe('新名称');

        // 验证只有一条记录
        const listResponse = await callApi(favouriteListHandler, {
          method: 'GET',
          auth
        });
        const listData = expectSuccess(listResponse);
        expect(listData).toHaveLength(1);
      });

      it('缺少 appId 应该返回错误', async () => {
        const response = await callApi(favouriteUpdateHandler, {
          method: 'POST',
          auth,
          body: {}
        });

        expectError(response);
      });
    });

    describe('PUT /api/core/chat/setting/favourite/order', () => {
      it('应该成功调整收藏顺序', async () => {
        // 创建多个收藏
        const app2 = await testDataFactory.createApp({ teamId, name: '应用2' });
        const app3 = await testDataFactory.createApp({ teamId, name: '应用3' });

        await testDataFactory.createFavouriteApp({ teamId, tmbId, appId, order: 0 });
        const fav2 = await testDataFactory.createFavouriteApp({
          teamId,
          tmbId,
          appId: app2._id.toString(),
          order: 1
        });
        await testDataFactory.createFavouriteApp({
          teamId,
          tmbId,
          appId: app3._id.toString(),
          order: 2
        });

        // 将第二个移到第一位
        const response = await callApi(favouriteOrderHandler, {
          method: 'PUT',
          auth,
          body: {
            favouriteId: fav2._id.toString(),
            targetOrder: 0
          }
        });

        const data = expectSuccess(response);
        expect(data.success).toBe(true);
      });
    });

    describe('PUT /api/core/chat/setting/favourite/tags', () => {
      it('应该成功更新收藏标签', async () => {
        const fav = await testDataFactory.createFavouriteApp({ teamId, tmbId, appId });

        const response = await callApi(favouriteTagsHandler, {
          method: 'PUT',
          auth,
          body: {
            favouriteId: fav._id.toString(),
            tags: ['工作', '重要', '常用']
          }
        });

        const data = expectSuccess(response);
        expect(data.tags).toHaveLength(3);
        expect(data.tags).toContain('工作');
      });

      it('标签过长应该返回错误', async () => {
        const fav = await testDataFactory.createFavouriteApp({ teamId, tmbId, appId });
        const longTag = 'a'.repeat(21);

        const response = await callApi(favouriteTagsHandler, {
          method: 'PUT',
          auth,
          body: {
            favouriteId: fav._id.toString(),
            tags: [longTag]
          }
        });

        expectError(response);
      });
    });

    describe('DELETE /api/core/chat/setting/favourite/delete', () => {
      it('应该成功删除收藏', async () => {
        const fav = await testDataFactory.createFavouriteApp({ teamId, tmbId, appId });

        const response = await callApi(favouriteDeleteHandler, {
          method: 'DELETE',
          auth,
          query: { favouriteId: fav._id.toString() }
        });

        const data = expectSuccess(response);
        expect(data.success).toBe(true);

        // 验证已删除
        const listResponse = await callApi(favouriteListHandler, {
          method: 'GET',
          auth
        });
        const listData = expectSuccess(listResponse);
        expect(listData).toHaveLength(0);
      });

      it('删除不存在的收藏应该返回错误', async () => {
        const response = await callApi(favouriteDeleteHandler, {
          method: 'DELETE',
          auth,
          query: { favouriteId: '507f1f77bcf86cd799439011' }
        });

        expectError(response);
      });
    });
  });
});
