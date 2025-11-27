/**
 * 优惠券 API 集成测试
 * 测试 Phase 6C 优惠券兑换相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import redeemHandler from '@/api/support/wallet/coupon/redeem';

describe('优惠券 API 测试', () => {
  let teamId: string;
  let tmbId: string;
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
    tmbId = context.tmbId;
    userId = context.userId;
    auth = context.auth;
  });

  // 辅助函数：创建兑换码
  async function createCouponCode(data: {
    code: string;
    batchId: string;
    type?: 'discount' | 'amount';
    value?: number;
    minAmount?: number;
    scope?: 'all' | 'recharge';
    expireTime?: Date;
    status?: 'unused' | 'used' | 'expired';
  }) {
    const { MongoCouponCode } = await import(
      '../../../src/packages/service/support_wallet/coupon/schema'
    );
    return MongoCouponCode.create({
      code: data.code.toUpperCase(),
      batchId: data.batchId,
      type: data.type || 'amount',
      value: data.value || 1000, // 默认 10 元
      minAmount: data.minAmount || 0,
      scope: data.scope || 'all',
      expireTime: data.expireTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 默认 7 天后过期
      status: data.status || 'unused'
    });
  }

  describe('GET /api/support/wallet/coupon/redeem', () => {
    it('应该成功兑换有效的优惠券', async () => {
      // 创建兑换码
      await createCouponCode({
        code: 'TEST001',
        batchId: 'BATCH001',
        type: 'amount',
        value: 5000 // 50 元
      });

      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'TEST001' }
      });

      const data = expectSuccess<{ coupon: { value: number }; message: string }>(response);
      expect(data.coupon.value).toBe(5000);
      expect(data.message).toContain('50.00');
    });

    it('应该成功兑换折扣券', async () => {
      await createCouponCode({
        code: 'DISCOUNT20',
        batchId: 'BATCH002',
        type: 'discount',
        value: 20 // 20% 折扣
      });

      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'DISCOUNT20' }
      });

      const data = expectSuccess<{ coupon: { type: string; value: number }; message: string }>(response);
      expect(data.coupon.type).toBe('discount');
      expect(data.coupon.value).toBe(20);
      expect(data.message).toContain('20%');
    });

    it('兑换码不存在应该返回错误', async () => {
      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'NOTEXIST' }
      });

      expectError(response);
    });

    it('已使用的兑换码应该返回错误', async () => {
      await createCouponCode({
        code: 'USED001',
        batchId: 'BATCH003',
        status: 'used'
      });

      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'USED001' }
      });

      expectError(response);
    });

    it('已过期的兑换码应该返回错误', async () => {
      await createCouponCode({
        code: 'EXPIRED001',
        batchId: 'BATCH004',
        expireTime: new Date(Date.now() - 1000) // 已过期
      });

      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'EXPIRED001' }
      });

      expectError(response);
    });

    it('同批次不能重复兑换', async () => {
      // 创建同批次的两个兑换码
      await createCouponCode({
        code: 'BATCH01_CODE1',
        batchId: 'BATCH_SAME'
      });
      await createCouponCode({
        code: 'BATCH01_CODE2',
        batchId: 'BATCH_SAME'
      });

      // 第一次兑换成功
      const response1 = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'BATCH01_CODE1' }
      });
      expectSuccess(response1);

      // 第二次兑换同批次应该失败
      const response2 = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'BATCH01_CODE2' }
      });
      expectError(response2);
    });

    it('兑换后兑换码状态应该变为已使用', async () => {
      await createCouponCode({
        code: 'CHECK001',
        batchId: 'BATCH005'
      });

      await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'CHECK001' }
      });

      // 验证兑换码状态
      const { MongoCouponCode } = await import(
        '../../../src/packages/service/support_wallet/coupon/schema'
      );
      const couponCode = await MongoCouponCode.findOne({ code: 'CHECK001' }).lean();
      expect(couponCode?.status).toBe('used');
      expect(couponCode?.usedBy).toBeTruthy();
      expect(couponCode?.usedTime).toBeTruthy();
    });

    it('兑换后应该创建用户优惠券', async () => {
      await createCouponCode({
        code: 'CREATE001',
        batchId: 'BATCH006',
        type: 'amount',
        value: 2000,
        minAmount: 5000,
        scope: 'recharge'
      });

      await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'CREATE001' }
      });

      // 验证用户优惠券
      const { MongoUserCoupon } = await import(
        '../../../src/packages/service/support_wallet/coupon/schema'
      );
      const userCoupon = await MongoUserCoupon.findOne({ userId }).lean();
      expect(userCoupon).toBeTruthy();
      expect(userCoupon?.type).toBe('amount');
      expect(userCoupon?.value).toBe(2000);
      expect(userCoupon?.minAmount).toBe(5000);
      expect(userCoupon?.scope).toBe('recharge');
      expect(userCoupon?.status).toBe('available');
    });

    it('兑换码大小写不敏感', async () => {
      await createCouponCode({
        code: 'LOWERCASE',
        batchId: 'BATCH007'
      });

      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: 'lowercase' }
      });

      expectSuccess(response);
    });

    it('空兑换码应该返回错误', async () => {
      const response = await callApi(redeemHandler, {
        method: 'GET',
        auth,
        query: { code: '' }
      });

      expectError(response);
    });

    it('未认证时应该返回错误', async () => {
      await createCouponCode({
        code: 'NOAUTH001',
        batchId: 'BATCH008'
      });

      const response = await callApi(redeemHandler, {
        method: 'GET',
        skipAuthMock: true,
        query: { code: 'NOAUTH001' }
      });

      expectError(response);
    });
  });
});
