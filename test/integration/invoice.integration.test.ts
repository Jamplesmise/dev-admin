/**
 * 发票管理模块集成测试
 * 使用真实 MongoDB 进行测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import {
  connectTestDB,
  disconnectTestDB,
  clearCollection,
  testDataFactory,
  getTestModels
} from '../utils/db';

describe('发票管理模块集成测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // 清理测试数据
    await clearCollection('invoices');
    await clearCollection('team_bills');
    await clearCollection('teams');
    await clearCollection('team_members');
    await clearCollection('users');

    // 创建基础测试数据
    const user = await testDataFactory.createUser({ username: '发票测试用户' });
    const team = await testDataFactory.createTeam({ name: '发票测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '发票测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
    userId = user._id.toString();
  });

  describe('发票创建测试', () => {
    it('应该成功创建普通发票', async () => {
      // 创建账单
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 100,
        payment: 'wx',
        status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId,
        tmbId,
        billIds: [bill._id.toString()],
        totalAmount: 100,
        type: 'normal',
        title: '测试公司',
        taxNumber: '91110000123456789X'
      });

      expect(invoice._id).toBeDefined();
      expect(invoice.type).toBe('normal');
      expect(invoice.title).toBe('测试公司');
      expect(invoice.totalAmount).toBe(100);
      expect(invoice.status).toBe('pending');
    });

    it('应该成功创建专用发票（含银行信息）', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 299,
        payment: 'alipay',
        status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId,
        tmbId,
        billIds: [bill._id.toString()],
        totalAmount: 299,
        type: 'special',
        title: '测试科技有限公司',
        taxNumber: '91110000987654321A',
        bankName: '中国工商银行',
        bankAccount: '6222021234567890123'
      });

      expect(invoice.type).toBe('special');
      expect(invoice.bankName).toBe('中国工商银行');
      expect(invoice.bankAccount).toBe('6222021234567890123');
    });

    it('应该支持多个账单合并开票', async () => {
      const bill1 = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 100,
        payment: 'wx',
        status: 'success'
      });

      const bill2 = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 200,
        payment: 'wx',
        status: 'success'
      });

      const bill3 = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 299,
        payment: 'alipay',
        status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId,
        tmbId,
        billIds: [bill1._id.toString(), bill2._id.toString(), bill3._id.toString()],
        totalAmount: 599, // 100 + 200 + 299
        title: '测试公司',
        taxNumber: '91110000123456789X'
      });

      expect(invoice.billIds.length).toBe(3);
      expect(invoice.totalAmount).toBe(599);
    });
  });

  describe('发票查询测试', () => {
    beforeEach(async () => {
      // 创建多个发票
      const bill1 = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });
      const bill2 = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 200, payment: 'wx', status: 'success'
      });
      const bill3 = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 300, payment: 'wx', status: 'success'
      });

      await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill1._id.toString()],
        totalAmount: 100,
        title: '公司A',
        taxNumber: '91110000123456789A',
        status: 'pending'
      });

      await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill2._id.toString()],
        totalAmount: 200,
        title: '公司B',
        taxNumber: '91110000123456789B',
        status: 'completed'
      });

      await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill3._id.toString()],
        totalAmount: 300,
        title: '公司C',
        taxNumber: '91110000123456789C',
        status: 'rejected'
      });
    });

    it('应该返回团队所有发票', async () => {
      const { Invoice } = getTestModels();
      const invoices = await Invoice.find({ teamId }).lean();

      expect(invoices.length).toBe(3);
    });

    it('应该按状态筛选发票', async () => {
      const { Invoice } = getTestModels();

      const pendingInvoices = await Invoice.find({
        teamId,
        status: 'pending'
      }).lean();
      expect(pendingInvoices.length).toBe(1);

      const completedInvoices = await Invoice.find({
        teamId,
        status: 'completed'
      }).lean();
      expect(completedInvoices.length).toBe(1);

      const rejectedInvoices = await Invoice.find({
        teamId,
        status: 'rejected'
      }).lean();
      expect(rejectedInvoices.length).toBe(1);
    });

    it('应该按创建时间排序', async () => {
      const { Invoice } = getTestModels();
      const invoices = await Invoice.find({ teamId })
        .sort({ createTime: -1 })
        .lean();

      expect(invoices.length).toBe(3);
      // 最新创建的在前
      for (let i = 0; i < invoices.length - 1; i++) {
        expect(invoices[i].createTime.getTime()).toBeGreaterThanOrEqual(
          invoices[i + 1].createTime.getTime()
        );
      }
    });

    it('应该支持分页查询', async () => {
      const { Invoice } = getTestModels();

      const page1 = await Invoice.find({ teamId })
        .sort({ createTime: -1 })
        .skip(0)
        .limit(2)
        .lean();
      expect(page1.length).toBe(2);

      const page2 = await Invoice.find({ teamId })
        .sort({ createTime: -1 })
        .skip(2)
        .limit(2)
        .lean();
      expect(page2.length).toBe(1);
    });
  });

  describe('发票状态流转测试', () => {
    it('应该支持 pending -> processing 状态转换', async () => {
      const bill = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill._id.toString()],
        totalAmount: 100,
        title: '测试公司',
        taxNumber: '91110000123456789X',
        status: 'pending'
      });

      const { Invoice } = getTestModels();

      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { status: 'processing' } }
      );

      const updated = await Invoice.findById(invoice._id).lean();
      expect(updated?.status).toBe('processing');
    });

    it('应该支持 processing -> completed 状态转换', async () => {
      const bill = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill._id.toString()],
        totalAmount: 100,
        title: '测试公司',
        taxNumber: '91110000123456789X',
        status: 'processing'
      });

      const { Invoice } = getTestModels();

      await Invoice.updateOne(
        { _id: invoice._id },
        {
          $set: {
            status: 'completed',
            invoiceNo: 'INV202411240001',
            invoiceCode: '044001800211',
            invoiceUrl: 'https://example.com/invoice.pdf',
            invoiceDate: new Date(),
            completeTime: new Date()
          }
        }
      );

      const updated = await Invoice.findById(invoice._id).lean();
      expect(updated?.status).toBe('completed');
      expect(updated?.invoiceNo).toBe('INV202411240001');
      expect(updated?.completeTime).toBeDefined();
    });

    it('应该支持 pending -> rejected 状态转换', async () => {
      const bill = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill._id.toString()],
        totalAmount: 100,
        title: '测试公司',
        taxNumber: '91110000123456789X',
        status: 'pending'
      });

      const { Invoice } = getTestModels();

      await Invoice.updateOne(
        { _id: invoice._id },
        {
          $set: {
            status: 'rejected',
            rejectReason: '税号格式不正确'
          }
        }
      );

      const updated = await Invoice.findById(invoice._id).lean();
      expect(updated?.status).toBe('rejected');
      expect(updated?.rejectReason).toBe('税号格式不正确');
    });
  });

  describe('账单与发票关联测试', () => {
    it('应该正确关联账单 ID', async () => {
      const bill1 = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });
      const bill2 = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 200, payment: 'wx', status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill1._id.toString(), bill2._id.toString()],
        totalAmount: 300,
        title: '测试公司',
        taxNumber: '91110000123456789X'
      });

      expect(invoice.billIds.length).toBe(2);
      expect(invoice.billIds[0].toString()).toBe(bill1._id.toString());
      expect(invoice.billIds[1].toString()).toBe(bill2._id.toString());
    });

    it('模拟账单标记为已开票', async () => {
      const bill = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });

      const invoice = await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill._id.toString()],
        totalAmount: 100,
        title: '测试公司',
        taxNumber: '91110000123456789X'
      });

      // 模拟标记账单为已开票
      const { Bill } = getTestModels();
      await Bill.updateOne(
        { _id: bill._id },
        { $set: { invoiced: true, invoiceId: invoice._id } }
      );

      const updatedBill = await Bill.findById(bill._id).lean();
      expect(updatedBill?.invoiced).toBe(true);
      expect(updatedBill?.invoiceId?.toString()).toBe(invoice._id.toString());
    });
  });

  describe('待开票账单查询测试', () => {
    beforeEach(async () => {
      // 创建未开票账单
      await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });
      await testDataFactory.createBill({
        teamId, tmbId, type: 'extraDatasetSize', price: 299, payment: 'alipay', status: 'success'
      });

      // 创建已开票账单
      const invoicedBill = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 200, payment: 'wx', status: 'success'
      });

      // 标记为已开票
      const { Bill } = getTestModels();
      await Bill.updateOne(
        { _id: invoicedBill._id },
        { $set: { invoiced: true } }
      );

      // 创建未支付成功的账单
      await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 500, payment: 'wx', status: 'pending'
      });
    });

    it('应该只返回未开票且支付成功的账单', async () => {
      const { Bill } = getTestModels();
      const unInvoicedBills = await Bill.find({
        teamId,
        status: 'success',
        invoiced: { $ne: true }
      }).lean();

      expect(unInvoicedBills.length).toBe(2);
      unInvoicedBills.forEach(bill => {
        expect(bill.status).toBe('success');
        expect(bill.invoiced).not.toBe(true);
      });
    });

    it('应该计算待开票账单总金额', async () => {
      const { Bill } = getTestModels();
      const result = await Bill.aggregate([
        {
          $match: {
            teamId: new Types.ObjectId(teamId),
            status: 'success',
            invoiced: { $ne: true }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$price' },
            count: { $sum: 1 }
          }
        }
      ]);

      expect(result[0].count).toBe(2);
      expect(result[0].total).toBe(399); // 100 + 299
    });
  });

  describe('团队数据隔离测试', () => {
    it('不同团队的发票应该完全隔离', async () => {
      const team2 = await testDataFactory.createTeam({ name: '团队2' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });

      // 团队1创建账单和发票
      const bill1 = await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 100, payment: 'wx', status: 'success'
      });
      await testDataFactory.createInvoice({
        teamId, tmbId,
        billIds: [bill1._id.toString()],
        totalAmount: 100,
        title: '团队1公司',
        taxNumber: '91110000123456789X'
      });

      // 团队2创建账单和发票
      const bill2 = await testDataFactory.createBill({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        type: 'standard',
        price: 200,
        payment: 'wx',
        status: 'success'
      });
      await testDataFactory.createInvoice({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        billIds: [bill2._id.toString()],
        totalAmount: 200,
        title: '团队2公司',
        taxNumber: '91110000987654321A'
      });

      const { Invoice } = getTestModels();

      const team1Invoices = await Invoice.find({ teamId }).lean();
      const team2Invoices = await Invoice.find({ teamId: team2._id }).lean();

      expect(team1Invoices.length).toBe(1);
      expect(team2Invoices.length).toBe(1);
      expect(team1Invoices[0].title).toBe('团队1公司');
      expect(team2Invoices[0].title).toBe('团队2公司');
    });
  });

  describe('金额计算测试', () => {
    it('应该正确计算多账单合计金额', async () => {
      const bills = await Promise.all([
        testDataFactory.createBill({
          teamId, tmbId, type: 'standard', price: 100.50, payment: 'wx', status: 'success'
        }),
        testDataFactory.createBill({
          teamId, tmbId, type: 'standard', price: 200.25, payment: 'wx', status: 'success'
        }),
        testDataFactory.createBill({
          teamId, tmbId, type: 'extraDatasetSize', price: 299.99, payment: 'alipay', status: 'success'
        })
      ]);

      const { Bill } = getTestModels();
      const billIds = bills.map(b => b._id);

      // 查询并计算总金额
      const selectedBills = await Bill.find({ _id: { $in: billIds } }).lean();
      const totalAmount = selectedBills.reduce((sum, bill) => sum + bill.price, 0);

      // 100.50 + 200.25 + 299.99 = 600.74
      expect(totalAmount).toBeCloseTo(600.74, 2);
    });
  });
});
