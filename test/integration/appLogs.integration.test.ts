/**
 * 应用日志模块集成测试
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

describe('应用日志模块集成测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
  let appId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // 清理测试数据
    await clearCollection('chats');
    await clearCollection('apps');
    await clearCollection('teams');
    await clearCollection('team.members');
    await clearCollection('users');

    // 创建基础测试数据
    const user = await testDataFactory.createUser({ username: '日志测试用户' });
    const team = await testDataFactory.createTeam({ name: '日志测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '日志测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
    userId = user._id.toString();

    // 创建测试应用
    const app = await testDataFactory.createApp({
      teamId,
      tmbId,
      name: '测试应用'
    });
    appId = app._id.toString();
  });

  describe('聊天记录创建测试', () => {
    it('应该成功创建聊天记录', async () => {
      const chat = await testDataFactory.createChat({
        teamId,
        tmbId,
        appId,
        title: '测试对话',
        messageCount: 10,
        totalTokens: 1500,
        avgResponseTime: 1.5
      });

      expect(chat._id).toBeDefined();
      expect(chat.appId.toString()).toBe(appId);
      expect(chat.messageCount).toBe(10);
      expect(chat.totalTokens).toBe(1500);
    });

    it('应该支持创建多个聊天记录', async () => {
      await testDataFactory.createChat({ teamId, tmbId, appId, messageCount: 5, totalTokens: 500 });
      await testDataFactory.createChat({ teamId, tmbId, appId, messageCount: 10, totalTokens: 1000 });
      await testDataFactory.createChat({ teamId, tmbId, appId, messageCount: 15, totalTokens: 1500 });

      const { Chat } = getTestModels();
      const count = await Chat.countDocuments({ appId });
      expect(count).toBe(3);
    });

    it('应该支持指定创建时间', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const chat = await testDataFactory.createChat({
        teamId,
        tmbId,
        appId,
        createTime: yesterday
      });

      expect(chat.createTime.getTime()).toBe(yesterday.getTime());
    });
  });

  describe('总体数据聚合测试', () => {
    beforeEach(async () => {
      // 创建测试聊天数据
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 10,
        totalTokens: 1000,
        avgResponseTime: 1.2
      });
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 20,
        totalTokens: 2000,
        avgResponseTime: 1.5
      });
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 15,
        totalTokens: 1500,
        avgResponseTime: 1.8
      });
    });

    it('应该正确聚合总对话数', async () => {
      const { Chat } = getTestModels();
      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        { $group: { _id: null, totalChats: { $sum: 1 } } }
      ]);

      expect(result[0].totalChats).toBe(3);
    });

    it('应该正确聚合总消息数', async () => {
      const { Chat } = getTestModels();
      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        { $group: { _id: null, totalMessages: { $sum: '$messageCount' } } }
      ]);

      expect(result[0].totalMessages).toBe(45); // 10 + 20 + 15
    });

    it('应该正确聚合总 Token 数', async () => {
      const { Chat } = getTestModels();
      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        { $group: { _id: null, totalTokens: { $sum: '$totalTokens' } } }
      ]);

      expect(result[0].totalTokens).toBe(4500); // 1000 + 2000 + 1500
    });

    it('应该正确计算平均响应时间', async () => {
      const { Chat } = getTestModels();
      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        { $group: { _id: null, avgResponseTime: { $avg: '$avgResponseTime' } } }
      ]);

      // (1.2 + 1.5 + 1.8) / 3 = 1.5
      expect(result[0].avgResponseTime).toBeCloseTo(1.5, 1);
    });

    it('应该返回完整的统计数据', async () => {
      const { Chat } = getTestModels();
      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            totalTokens: { $sum: '$totalTokens' },
            avgResponseTime: { $avg: '$avgResponseTime' }
          }
        }
      ]);

      expect(result[0]).toEqual(expect.objectContaining({
        totalChats: 3,
        totalMessages: 45,
        totalTokens: 4500
      }));
      expect(result[0].avgResponseTime).toBeCloseTo(1.5, 1);
    });
  });

  describe('时间范围过滤测试', () => {
    beforeEach(async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 今天的记录
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 10,
        totalTokens: 1000,
        createTime: now
      });

      // 1 天前的记录
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 20,
        totalTokens: 2000,
        createTime: oneDayAgo
      });

      // 3 天前的记录
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 15,
        totalTokens: 1500,
        createTime: threeDaysAgo
      });

      // 7 天前的记录
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 25,
        totalTokens: 2500,
        createTime: sevenDaysAgo
      });
    });

    it('应该按时间范围过滤统计', async () => {
      const { Chat } = getTestModels();
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // 只统计最近 2 天的数据
      const result = await Chat.aggregate([
        {
          $match: {
            appId: new Types.ObjectId(appId),
            createTime: { $gte: twoDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' }
          }
        }
      ]);

      // 今天 + 1 天前 = 2 条
      expect(result[0].totalChats).toBe(2);
      expect(result[0].totalMessages).toBe(30); // 10 + 20
    });

    it('应该统计过去一周的数据', async () => {
      const { Chat } = getTestModels();
      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      const result = await Chat.aggregate([
        {
          $match: {
            appId: new Types.ObjectId(appId),
            createTime: { $gte: eightDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 }
          }
        }
      ]);

      // 全部 4 条都在 8 天内
      expect(result[0].totalChats).toBe(4);
    });
  });

  describe('图表数据聚合测试 - 按天', () => {
    beforeEach(async () => {
      const now = new Date();

      // 创建过去 5 天的数据
      for (let i = 0; i < 5; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // 每天创建 2 条记录
        await testDataFactory.createChat({
          teamId, tmbId, appId,
          messageCount: 10 + i,
          totalTokens: 1000 + i * 100,
          createTime: date
        });
        await testDataFactory.createChat({
          teamId, tmbId, appId,
          messageCount: 5 + i,
          totalTokens: 500 + i * 50,
          createTime: date
        });
      }
    });

    it('应该按天分组统计', async () => {
      const { Chat } = getTestModels();

      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createTime' }
            },
            chats: { $sum: 1 },
            messages: { $sum: '$messageCount' },
            tokens: { $sum: '$totalTokens' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      expect(result.length).toBe(5); // 5 天的数据

      // 每天应该有 2 条记录
      result.forEach(day => {
        expect(day.chats).toBe(2);
      });
    });

    it('应该正确生成图表数据格式', async () => {
      const { Chat } = getTestModels();
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const result = await Chat.aggregate([
        {
          $match: {
            appId: new Types.ObjectId(appId),
            createTime: { $gte: fiveDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createTime' }
            },
            chats: { $sum: 1 },
            messages: { $sum: '$messageCount' },
            tokens: { $sum: '$totalTokens' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // 转换为图表格式
      const labels = result.map(item => item._id);
      const datasets = {
        chats: result.map(item => item.chats),
        messages: result.map(item => item.messages),
        tokens: result.map(item => item.tokens)
      };

      expect(labels.length).toBe(5);
      expect(datasets.chats.length).toBe(5);
      expect(datasets.messages.length).toBe(5);
      expect(datasets.tokens.length).toBe(5);
    });
  });

  describe('图表数据聚合测试 - 按小时', () => {
    beforeEach(async () => {
      const now = new Date();

      // 创建过去 24 小时的数据，每小时 1 条
      for (let i = 0; i < 24; i++) {
        const date = new Date(now.getTime() - i * 60 * 60 * 1000);
        await testDataFactory.createChat({
          teamId, tmbId, appId,
          messageCount: 5,
          totalTokens: 500,
          createTime: date
        });
      }
    });

    it('应该按小时分组统计', async () => {
      const { Chat } = getTestModels();

      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d %H:00', date: '$createTime' }
            },
            chats: { $sum: 1 },
            messages: { $sum: '$messageCount' },
            tokens: { $sum: '$totalTokens' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      expect(result.length).toBe(24);

      // 每小时应该有 1 条记录
      result.forEach(hour => {
        expect(hour.chats).toBe(1);
        expect(hour.messages).toBe(5);
        expect(hour.tokens).toBe(500);
      });
    });
  });

  describe('空数据处理测试', () => {
    it('应该正确处理无聊天记录的应用', async () => {
      const { Chat } = getTestModels();

      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            totalTokens: { $sum: '$totalTokens' },
            avgResponseTime: { $avg: '$avgResponseTime' }
          }
        }
      ]);

      // 空结果应该返回空数组
      expect(result.length).toBe(0);
    });

    it('应该为空数据提供默认值', async () => {
      const { Chat } = getTestModels();

      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            totalTokens: { $sum: '$totalTokens' },
            avgResponseTime: { $avg: '$avgResponseTime' }
          }
        }
      ]);

      // 提供默认值
      const stats = result[0] || {
        totalChats: 0,
        totalMessages: 0,
        totalTokens: 0,
        avgResponseTime: 0
      };

      expect(stats.totalChats).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.avgResponseTime).toBe(0);
    });
  });

  describe('多应用数据隔离测试', () => {
    it('不同应用的统计数据应该隔离', async () => {
      // 创建第二个应用
      const app2 = await testDataFactory.createApp({ teamId, tmbId, name: '应用2' });

      // 为两个应用创建聊天记录
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 10,
        totalTokens: 1000
      });
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 20,
        totalTokens: 2000
      });

      await testDataFactory.createChat({
        teamId, tmbId, appId: app2._id.toString(),
        messageCount: 30,
        totalTokens: 3000
      });

      const { Chat } = getTestModels();

      // 应用1的统计
      const app1Stats = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' }
          }
        }
      ]);

      // 应用2的统计
      const app2Stats = await Chat.aggregate([
        { $match: { appId: app2._id } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' }
          }
        }
      ]);

      expect(app1Stats[0].totalChats).toBe(2);
      expect(app1Stats[0].totalMessages).toBe(30); // 10 + 20
      expect(app2Stats[0].totalChats).toBe(1);
      expect(app2Stats[0].totalMessages).toBe(30);
    });
  });

  describe('团队数据隔离测试', () => {
    it('不同团队的应用日志应该完全隔离', async () => {
      const team2 = await testDataFactory.createTeam({ name: '团队2' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });
      const app2 = await testDataFactory.createApp({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        name: '团队2应用'
      });

      // 团队1的聊天记录
      await testDataFactory.createChat({
        teamId, tmbId, appId,
        messageCount: 10,
        totalTokens: 1000
      });

      // 团队2的聊天记录
      await testDataFactory.createChat({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        appId: app2._id.toString(),
        messageCount: 20,
        totalTokens: 2000
      });

      const { Chat } = getTestModels();

      const team1Chats = await Chat.find({ teamId }).lean();
      const team2Chats = await Chat.find({ teamId: team2._id }).lean();

      expect(team1Chats.length).toBe(1);
      expect(team2Chats.length).toBe(1);
      expect(team1Chats[0].messageCount).toBe(10);
      expect(team2Chats[0].messageCount).toBe(20);
    });
  });

  describe('性能测试', () => {
    it('应该能高效处理大量聊天记录', async () => {
      // 创建 100 条聊天记录
      const createPromises: Promise<unknown>[] = [];
      for (let i = 0; i < 100; i++) {
        createPromises.push(
          testDataFactory.createChat({
            teamId, tmbId, appId,
            messageCount: Math.floor(Math.random() * 50) + 1,
            totalTokens: Math.floor(Math.random() * 5000) + 100,
            avgResponseTime: Math.random() * 3
          })
        );
      }
      await Promise.all(createPromises);

      const { Chat } = getTestModels();

      const startTime = Date.now();

      const result = await Chat.aggregate([
        { $match: { appId: new Types.ObjectId(appId) } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            totalTokens: { $sum: '$totalTokens' },
            avgResponseTime: { $avg: '$avgResponseTime' }
          }
        }
      ]);

      const duration = Date.now() - startTime;

      expect(result[0].totalChats).toBe(100);
      expect(duration).toBeLessThan(2000); // 应该在 2 秒内完成
    });
  });
});
