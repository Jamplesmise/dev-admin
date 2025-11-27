/**
 * 推广记录列表 API 测试
 * GET /api/support/activity/promotion/getPromotions
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/support/activity/promotion/getPromotions';

describe('GET /api/support/activity/promotion/getPromotions', () => {
  let auth: AuthHeaders;
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
    await clearAllTestCollections();

    // 创建测试用户和团队
    const user = await testDataFactory.createUser({ username: '团队所有者' });
    userId = user._id.toString();

    const team = await testDataFactory.createTeam({ name: '测试团队', ownerId: userId });
    teamId = team._id.toString();

    // 创建团队成员（owner 角色）
    const member = await testDataFactory.createTeamMember({
      teamId,
      userId,
      name: '团队所有者',
      role: 'owner',
      status: 'active'
    });
    tmbId = member._id.toString();

    auth = { teamId, tmbId, userId };
  });

  describe('正常获取列表', () => {
    it('空列表应返回正确结构', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(20);
      expect(data.totalPages).toBe(0);
    });

    it('应该返回推广记录列表', async () => {
      // 创建推广记录
      const promoter = await testDataFactory.createUser({ username: '推广人' });
      const invitee = await testDataFactory.createUser({ username: '被邀请人' });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO001',
        inviteeId: invitee._id.toString(),
        status: 'valid',
        reward: 1000
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(1);
      expect(data.total).toBe(1);
      expect(data.list[0].promotionCode).toBe('PROMO001');
      expect(data.list[0].status).toBe('valid');
      expect(data.list[0].reward).toBe(1000);
    });

    it('应该包含完整的记录信息', async () => {
      const promoter = await testDataFactory.createUser({ username: '推广人' });
      const invitee = await testDataFactory.createUser({ username: '被邀请人' });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO002',
        inviteeId: invitee._id.toString(),
        status: 'pending',
        reward: 500
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(1);

      const record = data.list[0];
      expect(record._id).toBeDefined();
      expect(record.promoterId).toBe(promoter._id.toString());
      expect(record.promotionCode).toBe('PROMO002');
      expect(record.inviteeId).toBe(invitee._id.toString());
      expect(record.status).toBe('pending');
      expect(record.reward).toBe(500);
      expect(record.registerTime).toBeDefined();
      expect(record.createTime).toBeDefined();
    });

    it('应该按创建时间倒序排列', async () => {
      const promoter = await testDataFactory.createUser({ username: '推广人' });
      const invitee1 = await testDataFactory.createUser({ username: '被邀请人1' });
      const invitee2 = await testDataFactory.createUser({ username: '被邀请人2' });
      const invitee3 = await testDataFactory.createUser({ username: '被邀请人3' });

      // 创建多条推广记录
      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO_FIRST',
        inviteeId: invitee1._id.toString()
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO_SECOND',
        inviteeId: invitee2._id.toString()
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO_THIRD',
        inviteeId: invitee3._id.toString()
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(3);
      // 最新的在前面
      expect(data.list[0].promotionCode).toBe('PROMO_THIRD');
      expect(data.list[1].promotionCode).toBe('PROMO_SECOND');
      expect(data.list[2].promotionCode).toBe('PROMO_FIRST');
    });
  });

  describe('分页功能', () => {
    it('默认返回第一页', async () => {
      const promoter = await testDataFactory.createUser({ username: '推广人' });

      // 创建 25 条记录
      for (let i = 0; i < 25; i++) {
        const invitee = await testDataFactory.createUser({ username: `被邀请人${i}` });
        await testDataFactory.createPromotionRecord({
          promoterId: promoter._id.toString(),
          promotionCode: `PROMO${i.toString().padStart(3, '0')}`,
          inviteeId: invitee._id.toString()
        });
      }

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(20); // 默认 pageSize 是 20
      expect(data.total).toBe(25);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(2);
    });

    it('应该支持自定义分页', async () => {
      const promoter = await testDataFactory.createUser({ username: '推广人' });

      // 创建 15 条记录
      for (let i = 0; i < 15; i++) {
        const invitee = await testDataFactory.createUser({ username: `被邀请人${i}` });
        await testDataFactory.createPromotionRecord({
          promoterId: promoter._id.toString(),
          promotionCode: `PROMO${i.toString().padStart(3, '0')}`,
          inviteeId: invitee._id.toString()
        });
      }

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: {
          page: '2',
          pageSize: '10'
        }
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(5); // 第二页只有 5 条
      expect(data.total).toBe(15);
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(10);
      expect(data.totalPages).toBe(2);
    });
  });

  describe('筛选功能', () => {
    it('应该支持按状态筛选', async () => {
      const promoter = await testDataFactory.createUser({ username: '推广人' });

      // 创建不同状态的记录
      const invitee1 = await testDataFactory.createUser({ username: '被邀请人1' });
      const invitee2 = await testDataFactory.createUser({ username: '被邀请人2' });
      const invitee3 = await testDataFactory.createUser({ username: '被邀请人3' });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO_PENDING',
        inviteeId: invitee1._id.toString(),
        status: 'pending'
      });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO_VALID',
        inviteeId: invitee2._id.toString(),
        status: 'valid'
      });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO_INVALID',
        inviteeId: invitee3._id.toString(),
        status: 'invalid'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { status: 'valid' }
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(1);
      expect(data.list[0].status).toBe('valid');
      expect(data.list[0].promotionCode).toBe('PROMO_VALID');
    });

    it('应该支持按推广人筛选', async () => {
      const promoter1 = await testDataFactory.createUser({ username: '推广人1' });
      const promoter2 = await testDataFactory.createUser({ username: '推广人2' });

      const invitee1 = await testDataFactory.createUser({ username: '被邀请人1' });
      const invitee2 = await testDataFactory.createUser({ username: '被邀请人2' });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter1._id.toString(),
        promotionCode: 'PROMO_P1',
        inviteeId: invitee1._id.toString()
      });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter2._id.toString(),
        promotionCode: 'PROMO_P2',
        inviteeId: invitee2._id.toString()
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { promoterId: promoter1._id.toString() }
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBe(1);
      expect(data.list[0].promoterId).toBe(promoter1._id.toString());
    });

    it('无效状态值应被忽略', async () => {
      const promoter = await testDataFactory.createUser({ username: '推广人' });
      const invitee = await testDataFactory.createUser({ username: '被邀请人' });

      await testDataFactory.createPromotionRecord({
        promoterId: promoter._id.toString(),
        promotionCode: 'PROMO001',
        inviteeId: invitee._id.toString(),
        status: 'valid'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { status: 'invalid_status_value' }
      });

      const data = expectSuccess(response);
      // 无效状态值被忽略，返回所有记录
      expect(data.list.length).toBe(1);
    });
  });

  describe('权限验证', () => {
    it('owner 可以查看推广记录', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list).toBeDefined();
    });

    it('admin 可以查看推广记录', async () => {
      const adminUser = await testDataFactory.createUser({ username: '管理员' });
      const adminMember = await testDataFactory.createTeamMember({
        teamId,
        userId: adminUser._id.toString(),
        name: '管理员',
        role: 'admin',
        status: 'active'
      });

      const adminAuth = {
        teamId,
        tmbId: adminMember._id.toString(),
        userId: adminUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'GET',
        auth: adminAuth
      });

      const data = expectSuccess(response);
      expect(data.list).toBeDefined();
    });

    it('普通成员不能查看推广记录', async () => {
      const normalUser = await testDataFactory.createUser({ username: '普通成员' });
      const normalMember = await testDataFactory.createTeamMember({
        teamId,
        userId: normalUser._id.toString(),
        name: '普通成员',
        role: 'member',
        status: 'active'
      });

      const normalAuth = {
        teamId,
        tmbId: normalMember._id.toString(),
        userId: normalUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'GET',
        auth: normalAuth
      });

      expectError(response);
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        skipAuthMock: true
      });

      expectError(response);
    });
  });
});
