/**
 * 发票 API 集成测试
 * 测试所有 Invoice 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory, getTestModels } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import unInvoiceListHandler from '@/api/support/wallet/bill/invoice/unInvoiceList';
import submitHandler from '@/api/support/wallet/bill/invoice/submit';
import recordsHandler from '@/api/support/wallet/bill/invoice/records';
import downloadFileHandler from '@/api/support/wallet/bill/invoice/downloadFile';

describe('发票 API 测试', () => {
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

  describe('GET /api/support/wallet/bill/invoice/unInvoiceList', () => {
    it('应该返回空列表当没有待开票账单时', async () => {
      const response = await callApi(unInvoiceListHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('应该返回已支付且未开票的账单', async () => {
      // 创建已支付未开票的账单
      const { Bill } = getTestModels();
      await Bill.create({
        orderId: `FG${Date.now()}TEST1`,
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 100,
        payment: 'wx',
        status: 'success',
        invoiced: false,
        expireTime: new Date(Date.now() + 3600000)
      });

      // 创建未支付的账单（不应该返回）
      await Bill.create({
        orderId: `FG${Date.now()}TEST2`,
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 200,
        payment: 'wx',
        status: 'pending',
        invoiced: false,
        expireTime: new Date(Date.now() + 3600000)
      });

      // 创建已开票的账单（不应该返回）
      await Bill.create({
        orderId: `FG${Date.now()}TEST3`,
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 300,
        payment: 'wx',
        status: 'success',
        invoiced: true,
        expireTime: new Date(Date.now() + 3600000)
      });

      const response = await callApi(unInvoiceListHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ amount: number }[]>(response);
      expect(data).toHaveLength(1);
      expect(data[0].amount).toBe(100);
    });

    it('应该支持时间范围过滤', async () => {
      const { Bill } = getTestModels();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // 创建今天的账单
      await Bill.create({
        orderId: `FG${Date.now()}TODAY`,
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 100,
        payment: 'wx',
        status: 'success',
        invoiced: false,
        createTime: now,
        expireTime: new Date(now.getTime() + 3600000)
      });

      // 创建两天前的账单
      await Bill.create({
        orderId: `FG${Date.now()}OLD`,
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 200,
        payment: 'wx',
        status: 'success',
        invoiced: false,
        createTime: twoDaysAgo,
        expireTime: new Date(twoDaysAgo.getTime() + 3600000)
      });

      const response = await callApi(unInvoiceListHandler, {
        method: 'GET',
        auth,
        query: {
          startTime: yesterday.toISOString()
        }
      });

      const data = expectSuccess<{ amount: number }[]>(response);
      expect(data).toHaveLength(1);
      expect(data[0].amount).toBe(100);
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(unInvoiceListHandler, {
        method: 'GET',
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response);
    });
  });

  describe('POST /api/support/wallet/bill/invoice/submit', () => {
    let billId: string;

    beforeEach(async () => {
      // 创建可开票的账单
      const { Bill } = getTestModels();
      const bill = await Bill.create({
        orderId: `FG${Date.now()}SUBMIT`,
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 100,
        payment: 'wx',
        status: 'success',
        invoiced: false,
        expireTime: new Date(Date.now() + 3600000)
      });
      billId = bill._id.toString();
    });

    it('应该成功提交普通发票申请', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'normal',
          title: '测试公司',
          taxNumber: '1234567890123456',
          receiverEmail: 'test@example.com'
        }
      });

      const data = expectSuccess<{ _id: string; title: string; totalAmount: number }>(response);
      expect(data._id).toBeDefined();
      expect(data.title).toBe('测试公司');
      expect(data.totalAmount).toBe(100);
    });

    it('应该成功提交专用发票申请', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'special',
          title: '测试公司',
          taxNumber: '1234567890123456',
          bankName: '测试银行',
          bankAccount: '1234567890',
          address: '测试地址',
          phone: '13800138000',
          receiverEmail: 'test@example.com'
        }
      });

      const data = expectSuccess<{ type: string }>(response);
      expect(data.type).toBe('special');
    });

    it('账单应该被标记为已开票', async () => {
      await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'normal',
          title: '测试公司',
          taxNumber: '1234567890123456'
        }
      });

      // 验证账单已被标记为已开票
      const { Bill } = getTestModels();
      const bill = await Bill.findById(billId).lean();
      expect(bill?.invoiced).toBe(true);
    });

    it('缺少 billIds 应该返回错误', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          type: 'normal',
          title: '测试公司',
          taxNumber: '1234567890123456'
        }
      });

      expectError(response);
    });

    it('空 billIds 应该返回错误', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [],
          type: 'normal',
          title: '测试公司',
          taxNumber: '1234567890123456'
        }
      });

      expectError(response);
    });

    it('缺少发票抬头应该返回错误', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'normal',
          taxNumber: '1234567890123456'
        }
      });

      expectError(response);
    });

    it('缺少税号应该返回错误', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'normal',
          title: '测试公司'
        }
      });

      expectError(response);
    });

    it('专用发票缺少银行信息应该返回错误', async () => {
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'special',
          title: '测试公司',
          taxNumber: '1234567890123456'
          // 缺少 bankName, bankAccount, address, phone
        }
      });

      expectError(response);
    });

    it('已开票的账单不能重复开票', async () => {
      // 先开一次票
      await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'normal',
          title: '测试公司',
          taxNumber: '1234567890123456'
        }
      });

      // 尝试再次开票
      const response = await callApi(submitHandler, {
        method: 'POST',
        auth,
        body: {
          billIds: [billId],
          type: 'normal',
          title: '测试公司',
          taxNumber: '1234567890123456'
        }
      });

      expectError(response);
    });
  });

  describe('GET /api/support/wallet/bill/invoice/records', () => {
    beforeEach(async () => {
      // 创建发票记录
      await testDataFactory.createInvoice({
        teamId,
        tmbId,
        billIds: [],
        totalAmount: 100,
        title: '发票1',
        taxNumber: '1234567890123456',
        status: 'pending'
      });

      await testDataFactory.createInvoice({
        teamId,
        tmbId,
        billIds: [],
        totalAmount: 200,
        title: '发票2',
        taxNumber: '1234567890123456',
        status: 'completed'
      });
    });

    it('应该返回所有发票记录', async () => {
      const response = await callApi(recordsHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('应该支持按状态过滤', async () => {
      const response = await callApi(recordsHandler, {
        method: 'GET',
        auth,
        query: { status: 'pending' }
      });

      const data = expectSuccess<{ list: { title: string }[]; total: number }>(response);
      expect(data.list).toHaveLength(1);
      expect(data.list[0].title).toBe('发票1');
    });

    it('应该支持分页', async () => {
      // 创建更多发票
      for (let i = 0; i < 15; i++) {
        await testDataFactory.createInvoice({
          teamId,
          tmbId,
          billIds: [],
          totalAmount: 100 + i,
          title: `发票${i + 3}`,
          taxNumber: '1234567890123456',
          status: 'pending'
        });
      }

      const response = await callApi(recordsHandler, {
        method: 'GET',
        auth,
        query: { page: '1', pageSize: '5' }
      });

      const data = expectSuccess<{ list: unknown[]; total: number; page: number; pageSize: number }>(response);
      expect(data.list).toHaveLength(5);
      expect(data.total).toBe(17); // 2 + 15
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(5);
    });

    it('不同团队的发票应该隔离', async () => {
      // 创建另一个团队的发票
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });
      await testDataFactory.createInvoice({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        billIds: [],
        totalAmount: 500,
        title: '其他团队发票',
        taxNumber: '1234567890123456',
        status: 'pending'
      });

      const response = await callApi(recordsHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.total).toBe(2); // 只有当前团队的发票
    });
  });

  describe('GET /api/support/wallet/bill/invoice/downloadFile', () => {
    it('应该返回发票文件下载链接', async () => {
      // 创建已完成的发票（有下载链接）
      const invoice = await testDataFactory.createInvoice({
        teamId,
        tmbId,
        billIds: [],
        totalAmount: 100,
        title: '测试发票',
        taxNumber: '1234567890123456',
        status: 'completed'
      });

      // 手动设置发票URL
      const { Invoice } = getTestModels();
      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { invoiceUrl: 'https://example.com/invoice.pdf' } }
      );

      const response = await callApi(downloadFileHandler, {
        method: 'GET',
        auth,
        query: { invoiceId: invoice._id.toString() }
      });

      const data = expectSuccess<{ invoiceUrl: string }>(response);
      expect(data.invoiceUrl).toBe('https://example.com/invoice.pdf');
    });

    it('缺少 invoiceId 应该返回错误', async () => {
      const response = await callApi(downloadFileHandler, {
        method: 'GET',
        auth
      });

      expectError(response);
    });

    it('发票不存在应该返回错误', async () => {
      const response = await callApi(downloadFileHandler, {
        method: 'GET',
        auth,
        query: { invoiceId: '507f1f77bcf86cd799439011' }
      });

      expectError(response);
    });
  });
});
