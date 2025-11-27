/**
 * 审计日志模块集成测试
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
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

describe('审计日志模块集成测试', () => {
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
    await clearCollection('operationLogs');
    await clearCollection('teams');
    await clearCollection('team_members');
    await clearCollection('users');

    // 创建测试数据
    const user = await testDataFactory.createUser({ username: '测试用户' });
    const team = await testDataFactory.createTeam({ name: '测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
  });

  describe('操作日志写入测试', () => {
    it('应该成功写入 LOGIN 事件日志', async () => {
      const log = await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN,
        metadata: { ip: '192.168.1.1', userAgent: 'Chrome' }
      });

      expect(log._id).toBeDefined();
      expect(log.event).toBe(AuditEventEnum.LOGIN);
      expect(log.metadata.ip).toBe('192.168.1.1');
    });

    it('应该成功写入 CREATE_APP 事件日志', async () => {
      const log = await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.CREATE_APP,
        metadata: { appId: 'app-123', appName: '测试应用' }
      });

      expect(log.event).toBe(AuditEventEnum.CREATE_APP);
      expect(log.metadata.appName).toBe('测试应用');
    });

    it('应该成功批量写入多条日志', async () => {
      const events = [
        AuditEventEnum.LOGIN,
        AuditEventEnum.CREATE_APP,
        AuditEventEnum.UPDATE_APP_INFO,
        AuditEventEnum.DELETE_APP
      ];

      for (const event of events) {
        await testDataFactory.createOperationLog({ teamId, tmbId, event });
      }

      const { OperationLog } = getTestModels();
      const count = await OperationLog.countDocuments({ teamId });
      expect(count).toBe(4);
    });
  });

  describe('操作日志查询测试', () => {
    beforeEach(async () => {
      // 创建多条测试日志
      const events = [
        { event: AuditEventEnum.LOGIN, metadata: { ip: '192.168.1.1' } },
        { event: AuditEventEnum.LOGIN, metadata: { ip: '192.168.1.2' } },
        { event: AuditEventEnum.CREATE_APP, metadata: { appName: 'App1' } },
        { event: AuditEventEnum.CREATE_APP, metadata: { appName: 'App2' } },
        { event: AuditEventEnum.DELETE_APP, metadata: { appName: 'App1' } }
      ];

      for (const { event, metadata } of events) {
        await testDataFactory.createOperationLog({ teamId, tmbId, event, metadata });
      }
    });

    it('应该返回指定团队的所有日志', async () => {
      const { OperationLog } = getTestModels();
      const logs = await OperationLog.find({ teamId }).lean();

      expect(logs.length).toBe(5);
    });

    it('应该按事件类型过滤日志', async () => {
      const { OperationLog } = getTestModels();
      const loginLogs = await OperationLog.find({
        teamId,
        event: AuditEventEnum.LOGIN
      }).lean();

      expect(loginLogs.length).toBe(2);
    });

    it('应该按成员过滤日志', async () => {
      // 创建另一个成员的日志
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });
      await testDataFactory.createOperationLog({
        teamId,
        tmbId: member2._id.toString(),
        event: AuditEventEnum.LOGIN
      });

      const { OperationLog } = getTestModels();
      const member1Logs = await OperationLog.find({ teamId, tmbId }).lean();

      expect(member1Logs.length).toBe(5);
    });

    it('应该支持分页查询', async () => {
      const { OperationLog } = getTestModels();

      const page1 = await OperationLog.find({ teamId })
        .sort({ timestamp: -1 })
        .skip(0)
        .limit(2)
        .lean();

      const page2 = await OperationLog.find({ teamId })
        .sort({ timestamp: -1 })
        .skip(2)
        .limit(2)
        .lean();

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0]._id.toString()).not.toBe(page2[0]._id.toString());
    });

    it('应该按时间范围过滤日志', async () => {
      const { OperationLog } = getTestModels();

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentLogs = await OperationLog.find({
        teamId,
        timestamp: { $gte: oneHourAgo }
      }).lean();

      expect(recentLogs.length).toBe(5);

      // 创建一条"旧"日志
      const oldLog = await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      // 手动更新时间戳为 2 小时前
      await OperationLog.updateOne(
        { _id: oldLog._id },
        { $set: { timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) } }
      );

      const recentLogsAfter = await OperationLog.find({
        teamId,
        timestamp: { $gte: oneHourAgo }
      }).lean();

      expect(recentLogsAfter.length).toBe(5);
    });
  });

  describe('数据隔离测试', () => {
    it('不同团队的日志应该隔离', async () => {
      // 创建另一个团队
      const team2 = await testDataFactory.createTeam({ name: '团队2' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });

      // 为两个团队各创建日志
      await testDataFactory.createOperationLog({
        teamId,
        tmbId,
        event: AuditEventEnum.LOGIN
      });

      await testDataFactory.createOperationLog({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        event: AuditEventEnum.LOGIN
      });

      const { OperationLog } = getTestModels();

      const team1Logs = await OperationLog.find({ teamId }).lean();
      const team2Logs = await OperationLog.find({ teamId: team2._id }).lean();

      expect(team1Logs.length).toBe(1);
      expect(team2Logs.length).toBe(1);
    });
  });

  describe('索引性能测试', () => {
    it('应该能高效查询大量日志', async () => {
      // 创建 100 条日志
      const createPromises: Promise<unknown>[] = [];
      for (let i = 0; i < 100; i++) {
        createPromises.push(
          testDataFactory.createOperationLog({
            teamId,
            tmbId,
            event: AuditEventEnum.LOGIN,
            metadata: { index: i }
          })
        );
      }
      await Promise.all(createPromises);

      const { OperationLog } = getTestModels();

      const startTime = Date.now();
      const logs = await OperationLog.find({ teamId })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();
      const duration = Date.now() - startTime;

      expect(logs.length).toBe(20);
      expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
    });
  });
});
