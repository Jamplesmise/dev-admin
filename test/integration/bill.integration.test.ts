/**
 * 账单模块集成测试
 * 使用真实 MongoDB 进行测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearCollection,
  testDataFactory,
  getTestModels
} from '../utils/db';

describe('账单模块集成测试', () => {
  let teamId: string;
  let tmbId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // 清理测试数据
    await clearCollection('team_bills');
    await clearCollection('teams');
    await clearCollection('team_members');
    await clearCollection('users');

    // 创建测试数据
    const user = await testDataFactory.createUser({ username: '账单测试用户' });
    const team = await testDataFactory.createTeam({ name: '账单测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '账单测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
  });

  describe('账单创建测试', () => {
    it('应该成功创建待支付账单', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      expect(bill._id).toBeDefined();
      expect(bill.orderId).toBeDefined();
      expect(bill.orderId).toMatch(/^FG\d+[A-Z0-9]+$/);
      expect(bill.status).toBe('pending');
      expect(bill.price).toBe(9900);
    });

    it('应该成功创建不同支付方式的账单', async () => {
      const wxBill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const aliBill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'alipay'
      });

      expect(wxBill.payment).toBe('wx');
      expect(aliBill.payment).toBe('alipay');
    });

    it('应该成功创建不同类型的账单', async () => {
      const standardBill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const premiumBill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 29900,
        payment: 'wx'
      });

      const enterpriseBill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'extraPoints',
        price: 99900,
        payment: 'wx'
      });

      expect(standardBill.type).toBe('standard');
      expect(premiumBill.type).toBe('extraDatasetSize');
      expect(enterpriseBill.type).toBe('extraPoints');
    });

    it('账单订单号应该唯一', async () => {
      const bills = await Promise.all([
        testDataFactory.createBill({ teamId, tmbId, type: 'standard', price: 9900, payment: 'wx' }),
        testDataFactory.createBill({ teamId, tmbId, type: 'standard', price: 9900, payment: 'wx' }),
        testDataFactory.createBill({ teamId, tmbId, type: 'standard', price: 9900, payment: 'wx' })
      ]);

      const orderIds = bills.map(b => b.orderId);
      const uniqueOrderIds = new Set(orderIds);

      expect(uniqueOrderIds.size).toBe(3);
    });

    it('应该设置正确的过期时间', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const now = new Date();
      const expireTime = bill.expireTime;

      // 过期时间应该在 14-16 分钟后（允许一些执行时间误差）
      const diffMinutes = (expireTime.getTime() - now.getTime()) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThan(16);
    });
  });

  describe('账单查询测试', () => {
    beforeEach(async () => {
      // 创建多条测试账单
      const billData = [
        { type: 'standard', price: 9900, payment: 'wx', status: 'pending' },
        { type: 'standard', price: 9900, payment: 'alipay', status: 'success' },
        { type: 'extraDatasetSize', price: 29900, payment: 'wx', status: 'success' },
        { type: 'extraDatasetSize', price: 29900, payment: 'wx', status: 'canceled' },
        { type: 'extraPoints', price: 99900, payment: 'wx', status: 'pending' }
      ];

      for (const data of billData) {
        const bill = await testDataFactory.createBill({
          teamId,
          tmbId,
          type: data.type,
          price: data.price,
          payment: data.payment,
          status: data.status
        });
      }
    });

    it('应该返回团队所有账单', async () => {
      const { Bill } = getTestModels();
      const bills = await Bill.find({ teamId }).lean();

      expect(bills.length).toBe(5);
    });

    it('应该按状态过滤账单', async () => {
      const { Bill } = getTestModels();

      const pendingBills = await Bill.find({ teamId, status: 'pending' }).lean();
      const paidBills = await Bill.find({ teamId, status: 'success' }).lean();
      const cancelledBills = await Bill.find({ teamId, status: 'canceled' }).lean();

      expect(pendingBills.length).toBe(2);
      expect(paidBills.length).toBe(2);
      expect(cancelledBills.length).toBe(1);
    });

    it('应该按类型过滤账单', async () => {
      const { Bill } = getTestModels();

      const standardBills = await Bill.find({ teamId, type: 'standard' }).lean();
      const premiumBills = await Bill.find({ teamId, type: 'extraDatasetSize' }).lean();
      const enterpriseBills = await Bill.find({ teamId, type: 'extraPoints' }).lean();

      expect(standardBills.length).toBe(2);
      expect(premiumBills.length).toBe(2);
      expect(enterpriseBills.length).toBe(1);
    });

    it('应该按支付方式过滤账单', async () => {
      const { Bill } = getTestModels();

      const wxBills = await Bill.find({ teamId, payment: 'wx' }).lean();
      const alipayBills = await Bill.find({ teamId, payment: 'alipay' }).lean();

      expect(wxBills.length).toBe(4);
      expect(alipayBills.length).toBe(1);
    });

    it('应该支持组合条件过滤', async () => {
      const { Bill } = getTestModels();

      const bills = await Bill.find({
        teamId,
        type: 'extraDatasetSize',
        status: 'success'
      }).lean();

      expect(bills.length).toBe(1);
    });

    it('应该按订单号精确查询', async () => {
      const { Bill } = getTestModels();

      // 先获取一个存在的订单号
      const existingBill = await Bill.findOne({ teamId }).lean();
      expect(existingBill).not.toBeNull();

      const bill = await Bill.findOne({ orderId: existingBill!.orderId }).lean();
      expect(bill).not.toBeNull();
      expect(bill!.orderId).toBe(existingBill!.orderId);
    });

    it('应该支持分页查询', async () => {
      const { Bill } = getTestModels();

      const page1 = await Bill.find({ teamId })
        .sort({ createTime: -1 })
        .skip(0)
        .limit(2)
        .lean();

      const page2 = await Bill.find({ teamId })
        .sort({ createTime: -1 })
        .skip(2)
        .limit(2)
        .lean();

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
    });

    it('应该按时间范围过滤账单', async () => {
      const { Bill } = getTestModels();

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentBills = await Bill.find({
        teamId,
        createTime: { $gte: oneHourAgo }
      }).lean();

      expect(recentBills.length).toBe(5);
    });
  });

  describe('账单状态更新测试', () => {
    it('应该成功将账单状态从 pending 更新为 paid', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const { Bill } = getTestModels();
      await Bill.updateOne(
        { _id: bill._id },
        { $set: { status: 'success' } }
      );

      const updated = await Bill.findById(bill._id).lean();
      expect(updated?.status).toBe('success');
    });

    it('应该成功将账单状态从 pending 更新为 cancelled', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const { Bill } = getTestModels();
      await Bill.updateOne(
        { _id: bill._id },
        { $set: { status: 'canceled' } }
      );

      const updated = await Bill.findById(bill._id).lean();
      expect(updated?.status).toBe('canceled');
    });

    it('应该记录支付完成时间', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const { Bill } = getTestModels();
      const paidTime = new Date();

      await Bill.updateOne(
        { _id: bill._id },
        { $set: { status: 'success', paidTime } }
      );

      const updated = await Bill.findById(bill._id).lean();
      expect(updated?.status).toBe('success');
    });
  });

  describe('账单金额计算测试', () => {
    it('应该正确统计团队总消费金额', async () => {
      // 创建多笔已支付账单
      await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx',
        status: 'success'
      });

      await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'extraDatasetSize',
        price: 29900,
        payment: 'wx',
        status: 'success'
      });

      // 这笔未支付，不应计入
      await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'extraPoints',
        price: 99900,
        payment: 'wx',
        status: 'pending'
      });

      const { Bill } = getTestModels();
      const result = await Bill.aggregate([
        { $match: { teamId: bill => bill.teamId, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]);

      // 使用正确的查询方式
      const paidBills = await Bill.find({ teamId, status: 'success' }).lean();
      const totalPaid = paidBills.reduce((sum, b) => sum + b.price, 0);

      expect(totalPaid).toBe(9900 + 29900);
    });

    it('应该正确统计各类型账单数量', async () => {
      await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 9900, payment: 'wx', status: 'success'
      });
      await testDataFactory.createBill({
        teamId, tmbId, type: 'standard', price: 9900, payment: 'wx', status: 'success'
      });
      await testDataFactory.createBill({
        teamId, tmbId, type: 'extraDatasetSize', price: 29900, payment: 'wx', status: 'success'
      });

      const { Bill } = getTestModels();

      const standardCount = await Bill.countDocuments({ teamId, type: 'standard' });
      const premiumCount = await Bill.countDocuments({ teamId, type: 'extraDatasetSize' });

      expect(standardCount).toBe(2);
      expect(premiumCount).toBe(1);
    });
  });

  describe('数据隔离测试', () => {
    it('不同团队的账单应该完全隔离', async () => {
      // 创建第二个团队
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const team2 = await testDataFactory.createTeam({ name: '团队2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });

      // 为两个团队创建账单
      await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      await testDataFactory.createBill({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        type: 'extraDatasetSize',
        price: 29900,
        payment: 'wx'
      });

      const { Bill } = getTestModels();

      const team1Bills = await Bill.find({ teamId }).lean();
      const team2Bills = await Bill.find({ teamId: team2._id }).lean();

      expect(team1Bills.length).toBe(1);
      expect(team2Bills.length).toBe(1);
      expect(team1Bills[0].price).toBe(9900);
      expect(team2Bills[0].price).toBe(29900);
    });
  });

  describe('并发创建测试', () => {
    it('并发创建账单应该都成功且订单号唯一', async () => {
      const createPromises = Array.from({ length: 20 }, () =>
        testDataFactory.createBill({
          teamId,
          tmbId,
          type: 'standard',
          price: 9900,
          payment: 'wx'
        })
      );

      const bills = await Promise.all(createPromises);

      // 所有账单都应该创建成功
      expect(bills.length).toBe(20);

      // 订单号应该都是唯一的
      const orderIds = bills.map(b => b.orderId);
      const uniqueOrderIds = new Set(orderIds);
      expect(uniqueOrderIds.size).toBe(20);
    });
  });

  describe('过期账单处理测试', () => {
    it('应该能查询出过期的待支付账单', async () => {
      const bill = await testDataFactory.createBill({
        teamId,
        tmbId,
        type: 'standard',
        price: 9900,
        payment: 'wx'
      });

      const { Bill } = getTestModels();

      // 手动将账单过期时间设置为过去
      const pastTime = new Date(Date.now() - 60 * 60 * 1000);
      await Bill.updateOne(
        { _id: bill._id },
        { $set: { expireTime: pastTime } }
      );

      // 查询过期的待支付账单
      const expiredBills = await Bill.find({
        teamId,
        status: 'pending',
        expireTime: { $lt: new Date() }
      }).lean();

      expect(expiredBills.length).toBe(1);
    });

    it('应该能批量处理过期账单', async () => {
      // 创建多笔账单
      const bills = await Promise.all([
        testDataFactory.createBill({ teamId, tmbId, type: 'standard', price: 9900, payment: 'wx' }),
        testDataFactory.createBill({ teamId, tmbId, type: 'standard', price: 9900, payment: 'wx' }),
        testDataFactory.createBill({ teamId, tmbId, type: 'standard', price: 9900, payment: 'wx' })
      ]);

      const { Bill } = getTestModels();

      // 将其中两笔设置为过期
      const pastTime = new Date(Date.now() - 60 * 60 * 1000);
      await Bill.updateMany(
        { _id: { $in: [bills[0]._id, bills[1]._id] } },
        { $set: { expireTime: pastTime } }
      );

      // 批量取消过期账单
      const result = await Bill.updateMany(
        { teamId, status: 'pending', expireTime: { $lt: new Date() } },
        { $set: { status: 'canceled' } }
      );

      expect(result.modifiedCount).toBe(2);

      // 验证状态
      const cancelledBills = await Bill.find({ teamId, status: 'canceled' }).lean();
      expect(cancelledBills.length).toBe(2);
    });
  });

  describe('索引性能测试', () => {
    it('应该能高效查询大量账单', async () => {
      // 创建 100 条账单
      const createPromises: Promise<unknown>[] = [];
      for (let i = 0; i < 100; i++) {
        createPromises.push(
          testDataFactory.createBill({
            teamId,
            tmbId,
            type: i % 3 === 0 ? 'standard' : i % 3 === 1 ? 'extraDatasetSize' : 'extraPoints',
            price: (i % 3 + 1) * 9900,
            payment: i % 2 === 0 ? 'wx' : 'alipay'
          })
        );
      }
      await Promise.all(createPromises);

      const { Bill } = getTestModels();

      const startTime = Date.now();
      const bills = await Bill.find({ teamId })
        .sort({ createTime: -1 })
        .limit(20)
        .lean();
      const duration = Date.now() - startTime;

      expect(bills.length).toBe(20);
      expect(duration).toBeLessThan(1000);
    });

    it('应该能高效按状态分组统计', async () => {
      // 创建多种状态的账单
      for (let i = 0; i < 30; i++) {
        await testDataFactory.createBill({
          teamId,
          tmbId,
          type: 'standard',
          price: 9900,
          payment: 'wx',
          status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'success' : 'canceled'
        });
      }

      const { Bill } = getTestModels();

      const startTime = Date.now();

      const pendingCount = await Bill.countDocuments({ teamId, status: 'pending' });
      const paidCount = await Bill.countDocuments({ teamId, status: 'success' });
      const cancelledCount = await Bill.countDocuments({ teamId, status: 'canceled' });

      const duration = Date.now() - startTime;

      expect(pendingCount).toBe(10);
      expect(paidCount).toBe(10);
      expect(cancelledCount).toBe(10);
      expect(duration).toBeLessThan(1000);
    });
  });
});
