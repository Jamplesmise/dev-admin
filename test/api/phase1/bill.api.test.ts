/**
 * 账单 API 集成测试
 * 测试所有 Bill 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory, getTestModels } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import createHandler from '@/api/support/wallet/bill/create';
import listHandler from '@/api/support/wallet/bill/list';
import updatePaymentHandler from '@/api/support/wallet/bill/pay/updatePayment';
import checkPayResultHandler from '@/api/support/wallet/bill/pay/checkPayResult';
import balanceConversionHandler from '@/api/support/wallet/bill/balanceConversion';

describe('账单 API 测试', () => {
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

  describe('POST /api/support/wallet/bill/create', () => {
    it('应该成功创建标准订阅账单', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'standard',
          subLevel: 'team',
          subMode: 'month',
          payment: 'wx'
        }
      });

      const data = expectSuccess<{
        billId: string;
        orderId: string;
        price: number;
        readPrice: string;
        qrCode: string;
      }>(response);

      expect(data.billId).toBeDefined();
      expect(data.orderId).toMatch(/^FG/);
      expect(data.price).toBeGreaterThan(0);
      expect(data.readPrice).toMatch(/^¥/);
      expect(data.qrCode).toBeDefined();
    });

    it('应该成功创建扩展存储账单', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'extraDatasetSize',
          extraDatasetSize: 10, // 10GB
          payment: 'wx'
        }
      });

      const data = expectSuccess<{ price: number }>(response);
      expect(data.price).toBe(10000); // 10元/GB = 1000分/GB * 10GB
    });

    it('应该成功创建扩展积分账单', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'extraPoints',
          extraPoints: 1000,
          payment: 'alipay'
        }
      });

      const data = expectSuccess<{ price: number }>(response);
      expect(data.price).toBeGreaterThan(0);
    });

    it('年付应该有折扣', async () => {
      const monthResponse = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'standard',
          subLevel: 'team',
          subMode: 'month',
          payment: 'wx'
        }
      });

      const yearResponse = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'standard',
          subLevel: 'team',
          subMode: 'year',
          payment: 'wx'
        }
      });

      const monthData = expectSuccess<{ price: number }>(monthResponse);
      const yearData = expectSuccess<{ price: number }>(yearResponse);

      // 年付价格 = 月付价格 * 10
      expect(yearData.price).toBe(monthData.price * 10);
    });

    it('缺少 type 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          payment: 'wx'
        }
      });

      expectError(response);
    });

    it('缺少 payment 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'standard',
          subLevel: 'team'
        }
      });

      expectError(response);
    });

    it('无效的 type 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'invalid_type',
          payment: 'wx'
        }
      });

      expectError(response);
    });

    it('无效的 payment 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'standard',
          payment: 'invalid_payment'
        }
      });

      expectError(response);
    });
  });

  describe('POST /api/support/wallet/bill/list', () => {
    beforeEach(async () => {
      // 创建测试账单
      const { Bill } = getTestModels();

      await Bill.create({
        orderId: 'FG20240101TEST1',
        teamId,
        tmbId,
        type: 'standard',
        price: 29900,
        payment: 'wx',
        status: 'pending',
        expireTime: new Date(Date.now() + 3600000)
      });

      await Bill.create({
        orderId: 'FG20240101TEST2',
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 10000,
        payment: 'alipay',
        status: 'success',
        expireTime: new Date(Date.now() + 3600000),
        payTime: new Date()
      });

      await Bill.create({
        orderId: 'FG20240101TEST3',
        teamId,
        tmbId,
        type: 'extraPoints',
        price: 5000,
        payment: 'wx',
        status: 'failed',
        expireTime: new Date(Date.now() - 3600000)
      });
    });

    it('应该返回所有账单', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(3);
      expect(data.total).toBe(3);
    });

    it('应该按类型过滤', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'standard'
        }
      });

      const data = expectSuccess<{ list: { type: string }[]; total: number }>(response);
      expect(data.list).toHaveLength(1);
      expect(data.list[0].type).toBe('standard');
    });

    it('应该按状态过滤', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          status: 'success'
        }
      });

      const data = expectSuccess<{ list: { status: string }[]; total: number }>(response);
      expect(data.list).toHaveLength(1);
      expect(data.list[0].status).toBe('success');
    });

    it('应该按时间范围过滤', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          startTime: yesterday.toISOString()
        }
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.total).toBeGreaterThan(0);
    });

    it('应该支持分页', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          pageNum: 1,
          pageSize: 2
        }
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(2);
      expect(data.total).toBe(3);
    });

    it('应该返回格式化的价格', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{ list: { readPrice: string }[] }>(response);
      data.list.forEach(item => {
        expect(item.readPrice).toMatch(/^¥/);
      });
    });

    it('不同团队的账单应该隔离', async () => {
      // 创建另一个团队的账单
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });

      const { Bill } = getTestModels();
      await Bill.create({
        orderId: 'FG20240101OTHER',
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        type: 'standard',
        price: 29900,
        payment: 'wx',
        status: 'pending',
        expireTime: new Date(Date.now() + 3600000)
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.total).toBe(3); // 只有当前团队的
    });
  });

  describe('PUT /api/support/wallet/bill/pay/updatePayment', () => {
    let billId: string;

    beforeEach(async () => {
      const { Bill } = getTestModels();
      const bill = await Bill.create({
        orderId: `FG${Date.now()}TEST`,
        teamId,
        tmbId,
        type: 'standard',
        price: 29900,
        payment: 'wx',
        status: 'pending',
        expireTime: new Date(Date.now() + 3600000)
      });
      billId = bill._id.toString();
    });

    it('应该成功更新支付方式', async () => {
      const response = await callApi(updatePaymentHandler, {
        method: 'PUT',
        auth,
        body: {
          billId,
          payment: 'alipay'
        }
      });

      // API 返回新的支付二维码信息
      const data = expectSuccess<{ qrCode?: string; codeUrl?: string }>(response);
      expect(data.qrCode).toBeDefined();
      expect(data.codeUrl).toBeDefined();
    });

    it('缺少 billId 应该返回错误', async () => {
      const response = await callApi(updatePaymentHandler, {
        method: 'PUT',
        auth,
        body: {
          payment: 'alipay'
        }
      });

      expectError(response);
    });

    it('账单不存在应该返回错误', async () => {
      const response = await callApi(updatePaymentHandler, {
        method: 'PUT',
        auth,
        body: {
          billId: '507f1f77bcf86cd799439011',
          payment: 'alipay'
        }
      });

      expectError(response);
    });
  });

  describe('GET /api/support/wallet/bill/pay/checkPayResult', () => {
    it('应该返回待支付账单的状态', async () => {
      const { Bill } = getTestModels();
      const bill = await Bill.create({
        orderId: `FG${Date.now()}CHECK`,
        teamId,
        tmbId,
        type: 'standard',
        price: 29900,
        payment: 'wx',
        status: 'pending',
        expireTime: new Date(Date.now() + 3600000)
      });

      const response = await callApi(checkPayResultHandler, {
        method: 'GET',
        auth,
        query: { billId: bill._id.toString() }
      });

      const data = expectSuccess<{ status: string }>(response);
      expect(data.status).toBe('pending');
    });

    it('应该返回已支付账单的状态', async () => {
      const { Bill } = getTestModels();
      const bill = await Bill.create({
        orderId: `FG${Date.now()}PAID`,
        teamId,
        tmbId,
        type: 'standard',
        price: 29900,
        payment: 'wx',
        status: 'success',
        expireTime: new Date(Date.now() + 3600000),
        payTime: new Date()
      });

      const response = await callApi(checkPayResultHandler, {
        method: 'GET',
        auth,
        query: { billId: bill._id.toString() }
      });

      const data = expectSuccess<{ status: string }>(response);
      expect(data.status).toBe('success');
    });

    it('缺少 billId 应该返回错误', async () => {
      const response = await callApi(checkPayResultHandler, {
        method: 'GET',
        auth
      });

      expectError(response);
    });

    it('账单不存在应该返回错误', async () => {
      const response = await callApi(checkPayResultHandler, {
        method: 'GET',
        auth,
        query: { billId: '507f1f77bcf86cd799439011' }
      });

      expectError(response);
    });
  });

  describe('GET /api/support/wallet/bill/balanceConversion', () => {
    it('应该成功计算余额抵扣', async () => {
      const response = await callApi(balanceConversionHandler, {
        method: 'GET',
        auth,
        query: {
          type: 'extraPoints',
          amount: '1000' // 1000 积分
        }
      });

      // API 返回价格计算结果
      const data = expectSuccess<{ originalPrice: number; discountPrice: number; balanceUsed: number }>(response);
      expect(data.originalPrice).toBeGreaterThan(0);
      expect(data.discountPrice).toBeDefined();
      expect(data.balanceUsed).toBeDefined();
    });

    it('转换金额必须大于 0', async () => {
      const response = await callApi(balanceConversionHandler, {
        method: 'GET',
        auth,
        query: {
          type: 'extraPoints',
          amount: '0'
        }
      });

      expectError(response);
    });

    it('负数金额应该返回错误', async () => {
      const response = await callApi(balanceConversionHandler, {
        method: 'GET',
        auth,
        query: {
          type: 'extraPoints',
          amount: '-100'
        }
      });

      expectError(response);
    });
  });
});
