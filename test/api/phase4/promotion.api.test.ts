/**
 * 推广系统 API 集成测试
 * 测试推广数据获取 API
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handler
import getPromotionDataHandler from '@/api/support/activity/promotion/getPromotionData';

describe('推广系统 API 测试', () => {
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

  describe('GET /api/support/activity/promotion/getPromotionData', () => {
    it('应该成功获取推广数据（已登录用户）', async () => {
      const response = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
      expect(data.promotionCode).toBeDefined();
      expect(data.promotionCode).toContain('PROMO_');
      expect(data.promotionUrl).toBeDefined();
      expect(data.promotionUrl).toContain('register');
      expect(data.totalInvites).toBeGreaterThanOrEqual(0);
      expect(data.validInvites).toBeGreaterThanOrEqual(0);
      expect(data.totalReward).toBeGreaterThanOrEqual(0);
      expect(data.pendingReward).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.inviteList)).toBe(true);
    });

    it('应该返回空邀请列表（新用户）', async () => {
      const response = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.inviteList).toEqual([]);
      expect(data.totalInvites).toBe(0);
      expect(data.validInvites).toBe(0);
    });

    it('应该拒绝未登录用户', async () => {
      const response = await callApi(getPromotionDataHandler, {
        method: 'GET',
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response, 500); // 认证错误返回 500
      expect(response.body.message).toContain('未登录');
    });

    it('应该拒绝缺少 teamId 的请求', async () => {
      const response = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth: { ...auth, teamId: '' },
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response);
    });

    it('不同用户应该获得不同的推广码', async () => {
      // 第一个用户
      const response1 = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });
      const data1 = expectSuccess(response1);

      // 创建第二个用户
      const context2 = await createTestContext(testDataFactory);
      const response2 = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth: context2.auth
      });
      const data2 = expectSuccess(response2);

      // 验证推广码不同
      expect(data1.promotionCode).not.toBe(data2.promotionCode);
    });

    it('同一用户多次请求应该返回相同的推广码', async () => {
      const response1 = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });
      const data1 = expectSuccess(response1);

      const response2 = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });
      const data2 = expectSuccess(response2);

      expect(data1.promotionCode).toBe(data2.promotionCode);
    });

    it('推广统计数据应该合理（数值约束）', async () => {
      const response = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);

      // 有效邀请数不应超过总邀请数
      expect(data.validInvites).toBeLessThanOrEqual(data.totalInvites);

      // 待发放奖励不应超过总奖励
      expect(data.pendingReward).toBeLessThanOrEqual(data.totalReward);

      // 所有数值应该非负
      expect(data.totalInvites).toBeGreaterThanOrEqual(0);
      expect(data.validInvites).toBeGreaterThanOrEqual(0);
      expect(data.totalReward).toBeGreaterThanOrEqual(0);
      expect(data.pendingReward).toBeGreaterThanOrEqual(0);
    });

    it('推广链接应该包含完整的 URL 信息', async () => {
      const response = await callApi(getPromotionDataHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);

      // 验证推广链接格式
      expect(data.promotionUrl).toMatch(/^https?:\/\//);
      expect(data.promotionUrl).toContain('code=');
      expect(data.promotionUrl).toContain(data.promotionCode);
    });
  });
});
