/**
 * 审计日志 API 集成测试
 * 测试所有 Audit 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

// 导入 API handlers
import listHandler from '@/api/support/user/audit/list';

describe('审计日志 API 测试', () => {
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

  describe('POST /api/support/user/audit/list', () => {
    it('应该返回空列表当没有日志时', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it('应该返回所有日志', async () => {
      // 创建测试日志
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN,
        metadata: { ip: '192.168.1.1' }
      });

      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.CREATE_APP,
        metadata: { appName: '测试应用' }
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('应该按事件类型过滤', async () => {
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.CREATE_APP
      });

      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          events: [AuditEventEnum.LOGIN]
        }
      });

      const data = expectSuccess<{ list: { event: string }[]; total: number }>(response);
      expect(data.list).toHaveLength(2);
      data.list.forEach(item => {
        expect(item.event).toBe(AuditEventEnum.LOGIN);
      });
    });

    it('应该按成员过滤', async () => {
      // 创建另一个成员
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      await testDataFactory.createOperationLog({
        teamId,
        tmbId: member2._id.toString(),
        event: AuditEventEnum.LOGIN
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          tmbIds: [tmbId]
        }
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(1);
    });

    it('应该按时间范围过滤', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // 创建今天的日志
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      // 创建一条旧日志并手动设置时间
      const oldLog = await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.CREATE_APP
      });

      // 更新时间戳
      const { OperationLog } = await import('../../utils/db').then(m => m.getTestModels());
      await OperationLog.updateOne(
        { _id: oldLog._id },
        { $set: { timestamp: twoDaysAgo } }
      );

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          startTime: yesterday.toISOString()
        }
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.total).toBe(1);
    });

    it('应该支持分页', async () => {
      // 创建 15 条日志
      for (let i = 0; i < 15; i++) {
        await testDataFactory.createOperationLog({
          teamId,
          tmbId,
          event: AuditEventEnum.LOGIN,
          metadata: { index: i }
        });
      }

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          pageNum: 1,
          pageSize: 5
        }
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list).toHaveLength(5);
      expect(data.total).toBe(15);
    });

    it('应该返回成员信息', async () => {
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{
        list: { sourceMember: { tmbId: string; memberName: string } }[];
      }>(response);

      expect(data.list[0].sourceMember).toBeDefined();
      expect(data.list[0].sourceMember.tmbId).toBeDefined();
    });

    it('应该返回日志元数据', async () => {
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN,
        metadata: { ip: '192.168.1.1', userAgent: 'Chrome' }
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{
        list: { metadata: { ip: string; userAgent: string } }[];
      }>(response);

      expect(data.list[0].metadata.ip).toBe('192.168.1.1');
      expect(data.list[0].metadata.userAgent).toBe('Chrome');
    });

    it('缺少 teamId 应该返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        body: {},
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response);
    });

    it('不同团队的日志应该隔离', async () => {
      // 当前团队的日志
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      // 创建另一个团队的日志
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });
      await testDataFactory.createOperationLog({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        event: AuditEventEnum.LOGIN
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.total).toBe(1);
    });

    it('pageSize 应该限制为最大 100', async () => {
      // 创建 150 条日志
      const createPromises = [];
      for (let i = 0; i < 150; i++) {
        createPromises.push(
          testDataFactory.createOperationLog({
            teamId,
            tmbId,
            event: AuditEventEnum.LOGIN
          })
        );
      }
      await Promise.all(createPromises);

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {
          pageNum: 1,
          pageSize: 200 // 超过限制
        }
      });

      const data = expectSuccess<{ list: unknown[]; total: number }>(response);
      expect(data.list.length).toBeLessThanOrEqual(100);
      expect(data.total).toBe(150);
    });
  });
});
