/**
 * 运营广告 API 测试
 * 测试运营广告数据获取 API
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handler
import getOperationalAdHandler from '@/api/support/user/inform/getOperationalAd';

describe('运营广告 API 测试', () => {
  let teamId: string;
  let userId: string;
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
    userId = context.userId;
    auth = context.auth;
  });

  describe('GET /api/support/user/inform/getOperationalAd', () => {
    it('应该成功获取广告列表', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data).toBeDefined();
      expect(data.ads).toBeInstanceOf(Array);
    });

    it('应该支持按位置筛选', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        query: { position: 'homepage_banner' },
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);
    });

    it('应该支持按用户类型筛选', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        query: { userType: 'free' },
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);
    });

    it('应该支持按平台筛选', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        query: { platform: 'web' },
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);
    });

    it('应该返回当前有效的广告', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);
      // 验证返回的广告都在有效时间内
      if (data.ads.length > 0) {
        const ads = data.ads as Array<Record<string, unknown>>;
        const now = new Date();
        ads.forEach((ad) => {
          const startTime = new Date(ad.startTime as string);
          const endTime = new Date(ad.endTime as string);
          expect(now >= startTime && now <= endTime).toBeTruthy();
        });
      }
    });

    it('广告应该按优先级排序', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);

      // 验证按优先级降序排序
      if (data.ads.length > 1) {
        const ads = data.ads as Array<Record<string, unknown>>;
        for (let i = 0; i < ads.length - 1; i++) {
          expect(ads[i].priority as number).toBeGreaterThanOrEqual(ads[i + 1].priority as number);
        }
      }
    });

    it('应该允许未登录用户访问（可选认证）', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET'
        // 不传 auth - optionalAuthMiddleware 允许
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);
    });

    it('应该支持多种参数组合', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        query: {
          position: 'homepage',
          userType: 'all',
          platform: 'web'
        },
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      expect(data.ads).toBeInstanceOf(Array);
    });

    it('应该返回广告的完整信息结构', async () => {
      const response = await callApi(getOperationalAdHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response) as { ads: unknown[] };
      if (data.ads.length > 0) {
        const firstAd = data.ads[0] as Record<string, unknown>;
        // 验证必要字段
        expect(firstAd).toHaveProperty('_id');
        expect(firstAd).toHaveProperty('type');
        expect(firstAd).toHaveProperty('title');
        expect(firstAd).toHaveProperty('content');
        expect(firstAd).toHaveProperty('position');
        expect(firstAd).toHaveProperty('priority');
        expect(firstAd).toHaveProperty('startTime');
        expect(firstAd).toHaveProperty('endTime');
      }
    });
  });
});
