/**
 * 应用日志 API 集成测试
 * 测试所有 App Logs 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory, getTestModels } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import getTotalDataHandler from '@/api/core/app/logs/getTotalData';
import getChartDataHandler from '@/api/core/app/logs/getChartData';

describe('应用日志 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let auth: AuthHeaders;
  let appId: string;

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

    // 创建测试应用
    const app = await testDataFactory.createApp({
      teamId,
      tmbId,
      name: '测试应用'
    });
    appId = app._id.toString();
  });

  describe('GET /api/core/app/logs/getTotalData', () => {
    it('应该返回空统计数据当没有聊天记录时', async () => {
      const response = await callApi(getTotalDataHandler, {
        method: 'GET',
        auth,
        query: { appId }
      });

      const data = expectSuccess<{
        totalChats: number;
        totalMessages: number;
        totalTokens: number;
        avgResponseTime: number;
        satisfactionRate: number;
      }>(response);

      expect(data.totalChats).toBe(0);
      expect(data.totalMessages).toBe(0);
      expect(data.totalTokens).toBe(0);
      expect(data.avgResponseTime).toBe(0);
      expect(data.satisfactionRate).toBe(0);
    });

    it('应该返回正确的统计数据', async () => {
      // 创建聊天记录（需要设置 status 为 finish）
      const { Chat } = getTestModels();
      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-1',
        title: '对话1',
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 200,
        status: 'finish'
      });

      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-2',
        title: '对话2',
        messageCount: 20,
        totalTokens: 1000,
        avgResponseTime: 300,
        status: 'finish'
      });

      const response = await callApi(getTotalDataHandler, {
        method: 'GET',
        auth,
        query: { appId }
      });

      const data = expectSuccess<{
        totalChats: number;
        totalMessages: number;
        totalTokens: number;
        avgResponseTime: number;
      }>(response);

      expect(data.totalChats).toBe(2);
      expect(data.totalMessages).toBe(30);
      expect(data.totalTokens).toBe(1500);
      expect(data.avgResponseTime).toBe(250);
    });

    it('应该支持时间范围过滤', async () => {
      const { Chat } = getTestModels();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // 今天的聊天
      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-today',
        title: '今天对话',
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 200,
        status: 'finish',
        createTime: now
      });

      // 两天前的聊天
      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-old',
        title: '旧对话',
        messageCount: 20,
        totalTokens: 1000,
        avgResponseTime: 300,
        status: 'finish',
        createTime: twoDaysAgo
      });

      const response = await callApi(getTotalDataHandler, {
        method: 'GET',
        auth,
        query: {
          appId,
          startTime: yesterday.toISOString()
        }
      });

      const data = expectSuccess<{ totalChats: number }>(response);
      expect(data.totalChats).toBe(1); // 只有今天的
    });

    it('未完成的对话不应该计入统计', async () => {
      const { Chat } = getTestModels();

      // 已完成的对话
      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-finish',
        title: '已完成对话',
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 200,
        status: 'finish'
      });

      // 进行中的对话（不应该计入）
      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-ongoing',
        title: '进行中对话',
        messageCount: 5,
        totalTokens: 200,
        avgResponseTime: 100,
        status: 'running'
      });

      const response = await callApi(getTotalDataHandler, {
        method: 'GET',
        auth,
        query: { appId }
      });

      const data = expectSuccess<{ totalChats: number }>(response);
      expect(data.totalChats).toBe(1);
    });

    it('缺少 appId 应该返回错误', async () => {
      const response = await callApi(getTotalDataHandler, {
        method: 'GET',
        auth
      });

      expectError(response);
    });

    it('不同应用的数据应该隔离', async () => {
      const { Chat } = getTestModels();

      // 当前应用的对话
      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-app1',
        title: '应用1对话',
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 200,
        status: 'finish'
      });

      // 创建另一个应用及其对话
      const app2 = await testDataFactory.createApp({
        teamId,
        tmbId,
        name: '另一个应用'
      });

      await Chat.create({
        teamId,
        tmbId,
        appId: app2._id.toString(),
        chatId: 'chat-app2',
        title: '应用2对话',
        messageCount: 20,
        totalTokens: 1000,
        avgResponseTime: 300,
        status: 'finish'
      });

      const response = await callApi(getTotalDataHandler, {
        method: 'GET',
        auth,
        query: { appId }
      });

      const data = expectSuccess<{ totalChats: number; totalMessages: number }>(response);
      expect(data.totalChats).toBe(1);
      expect(data.totalMessages).toBe(10);
    });
  });

  describe('POST /api/core/app/logs/getChartData', () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = now.toISOString();

    it('应该返回空图表数据当没有聊天记录时', async () => {
      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'daily',
          startTime,
          endTime,
          metrics: ['chats', 'messages']
        }
      });

      const data = expectSuccess<{
        labels: string[];
        datasets: { metric: string; data: number[] }[];
      }>(response);

      expect(Array.isArray(data.labels)).toBe(true);
      expect(data.datasets).toHaveLength(2);
      // 所有数据点应该为 0
      data.datasets.forEach(ds => {
        ds.data.forEach(val => {
          expect(val).toBe(0);
        });
      });
    });

    it('应该返回正确的日图表数据', async () => {
      const { Chat } = getTestModels();
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-1',
        title: '对话1',
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 200,
        status: 'finish',
        createTime: today
      });

      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-2',
        title: '对话2',
        messageCount: 15,
        totalTokens: 700,
        avgResponseTime: 250,
        status: 'finish',
        createTime: today
      });

      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'daily',
          startTime,
          endTime,
          metrics: ['chats', 'messages', 'tokens']
        }
      });

      const data = expectSuccess<{
        labels: string[];
        datasets: { metric: string; label: string; data: number[] }[];
      }>(response);

      expect(data.datasets).toHaveLength(3);

      // 找到今天的数据点
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayIndex = data.labels.indexOf(todayStr);

      if (todayIndex !== -1) {
        const chatsDataset = data.datasets.find(ds => ds.metric === 'chats');
        const messagesDataset = data.datasets.find(ds => ds.metric === 'messages');

        expect(chatsDataset?.data[todayIndex]).toBe(2);
        expect(messagesDataset?.data[todayIndex]).toBe(25);
      }
    });

    it('应该返回正确的小时图表数据', async () => {
      const { Chat } = getTestModels();
      const now = new Date();
      const hourStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      await Chat.create({
        teamId,
        tmbId,
        appId,
        chatId: 'chat-hour',
        title: '小时对话',
        messageCount: 5,
        totalTokens: 250,
        avgResponseTime: 150,
        status: 'finish',
        createTime: now
      });

      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'hourly',
          startTime: hourStart.toISOString(),
          endTime: now.toISOString(),
          metrics: ['chats']
        }
      });

      const data = expectSuccess<{
        labels: string[];
        datasets: { metric: string; data: number[] }[];
      }>(response);

      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].metric).toBe('chats');
    });

    it('应该返回正确的指标标签', async () => {
      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'daily',
          startTime,
          endTime,
          metrics: ['chats', 'messages', 'tokens', 'avgResponseTime']
        }
      });

      const data = expectSuccess<{
        datasets: { metric: string; label: string }[];
      }>(response);

      const chatsDs = data.datasets.find(ds => ds.metric === 'chats');
      const messagesDs = data.datasets.find(ds => ds.metric === 'messages');
      const tokensDs = data.datasets.find(ds => ds.metric === 'tokens');
      const avgRespDs = data.datasets.find(ds => ds.metric === 'avgResponseTime');

      expect(chatsDs?.label).toBe('对话数');
      expect(messagesDs?.label).toBe('消息数');
      expect(tokensDs?.label).toBe('Token 数');
      expect(avgRespDs?.label).toBe('平均响应时间');
    });

    it('缺少 appId 应该返回错误', async () => {
      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          chartType: 'daily',
          startTime,
          endTime,
          metrics: ['chats']
        }
      });

      expectError(response);
    });

    it('缺少时间范围应该返回错误', async () => {
      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'daily',
          metrics: ['chats']
        }
      });

      expectError(response);
    });

    it('缺少指标应该返回错误', async () => {
      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'daily',
          startTime,
          endTime
        }
      });

      expectError(response);
    });

    it('空指标列表应该返回错误', async () => {
      const response = await callApi(getChartDataHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          chartType: 'daily',
          startTime,
          endTime,
          metrics: []
        }
      });

      expectError(response);
    });
  });
});
