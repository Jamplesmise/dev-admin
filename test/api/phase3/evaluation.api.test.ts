/**
 * 应用评估 API 集成测试
 * 测试所有 Evaluation 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import listHandler from '@/api/core/app/evaluation/list';
import deleteHandler from '@/api/core/app/evaluation/delete';
import listItemsHandler from '@/api/core/app/evaluation/listItems';
import deleteItemHandler from '@/api/core/app/evaluation/deleteItem';
import retryItemHandler from '@/api/core/app/evaluation/retryItem';
import updateItemHandler from '@/api/core/app/evaluation/updateItem';

describe('应用评估 API 测试', () => {
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
    const app = await testDataFactory.createApp({ teamId, name: '测试应用' });
    appId = app._id.toString();
  });

  describe('POST /api/core/app/evaluation/list', () => {
    it('应该返回空列表当没有评估任务时', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: { appId }
      });

      const data = expectSuccess(response);
      expect(data.list).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it('应该返回评估任务列表', async () => {
      // 创建测试评估任务
      await testDataFactory.createEvaluation({ teamId, tmbId, appId, name: '评估任务1' });
      await testDataFactory.createEvaluation({ teamId, tmbId, appId, name: '评估任务2' });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: { appId }
      });

      const data = expectSuccess(response);
      expect(data.list).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('应该支持分页参数', async () => {
      // 创建少量评估任务来测试分页逻辑
      await testDataFactory.createEvaluation({ teamId, tmbId, appId, name: '评估任务1' });
      await testDataFactory.createEvaluation({ teamId, tmbId, appId, name: '评估任务2' });
      await testDataFactory.createEvaluation({ teamId, tmbId, appId, name: '评估任务3' });

      // 测试分页参数生效
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: { appId, pageNum: 1, pageSize: 2 }
      });

      const data = expectSuccess(response);
      expect(data.list).toHaveLength(2);
      expect(data.total).toBe(3);
    });

    it('应该支持按状态筛选', async () => {
      await testDataFactory.createEvaluation({
        teamId,
        tmbId,
        appId,
        name: '待执行任务',
        status: 'pending'
      });
      await testDataFactory.createEvaluation({
        teamId,
        tmbId,
        appId,
        name: '已完成任务',
        status: 'completed'
      });

      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: { appId, status: 'pending' }
      });

      const data = expectSuccess(response);
      expect(data.list).toHaveLength(1);
      expect(data.list[0].name).toBe('待执行任务');
    });

    it('缺少 appId 应该返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: {}
      });

      expectError(response);
    });
  });

  describe('DELETE /api/core/app/evaluation/delete', () => {
    it('应该成功删除评估任务及其项目', async () => {
      const evaluation = await testDataFactory.createEvaluation({
        teamId,
        tmbId,
        appId,
        name: '待删除任务'
      });
      const evaluationId = evaluation._id.toString();

      // 创建评估项目
      await testDataFactory.createEvaluationItem({
        evaluationId,
        input: '测试问题'
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: { evaluationId }
      });

      const data = expectSuccess(response);
      expect(data.success).toBe(true);

      // 验证已删除
      const listResponse = await callApi(listHandler, {
        method: 'POST',
        auth,
        body: { appId }
      });
      const listData = expectSuccess(listResponse);
      expect(listData.list).toHaveLength(0);
    });

    it('删除不存在的评估任务应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: { evaluationId: '507f1f77bcf86cd799439011' }
      });

      expectError(response);
    });
  });

  describe('评估项目管理', () => {
    let evaluationId: string;

    beforeEach(async () => {
      const evaluation = await testDataFactory.createEvaluation({
        teamId,
        tmbId,
        appId,
        name: '测试评估任务'
      });
      evaluationId = evaluation._id.toString();
    });

    describe('POST /api/core/app/evaluation/listItems', () => {
      it('应该返回空列表当没有评估项目时', async () => {
        const response = await callApi(listItemsHandler, {
          method: 'POST',
          auth,
          body: { evaluationId }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(0);
        expect(data.total).toBe(0);
      });

      it('应该返回评估项目列表', async () => {
        await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '问题1'
        });
        await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '问题2'
        });

        const response = await callApi(listItemsHandler, {
          method: 'POST',
          auth,
          body: { evaluationId }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(2);
        expect(data.total).toBe(2);
      });

      it('应该支持按状态筛选', async () => {
        await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '待执行问题',
          status: 'pending'
        });
        await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '已完成问题',
          status: 'completed'
        });

        const response = await callApi(listItemsHandler, {
          method: 'POST',
          auth,
          body: { evaluationId, status: 'completed' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(1);
        expect(data.list[0].input).toBe('已完成问题');
      });
    });

    describe('DELETE /api/core/app/evaluation/deleteItem', () => {
      it('应该成功删除评估项目', async () => {
        const item = await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '待删除问题'
        });

        const response = await callApi(deleteItemHandler, {
          method: 'DELETE',
          auth,
          body: { itemId: item._id.toString() }
        });

        const data = expectSuccess(response);
        expect(data.success).toBe(true);
      });

      it('删除不存在的评估项目应该返回错误', async () => {
        const response = await callApi(deleteItemHandler, {
          method: 'DELETE',
          auth,
          body: { itemId: '507f1f77bcf86cd799439011' }
        });

        expectError(response);
      });
    });

    describe('POST /api/core/app/evaluation/retryItem', () => {
      it('应该成功重试评估项目并重置所有结果字段', async () => {
        const item = await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '待重试问题',
          status: 'failed',
          error: '执行失败'
        });

        const response = await callApi(retryItemHandler, {
          method: 'POST',
          auth,
          body: { itemId: item._id.toString() }
        });

        const data = expectSuccess(response);
        // 验证状态重置
        expect(data.status).toBe('pending');
        expect(data.retryCount).toBe(1);
        // 验证所有结果字段被清除
        expect(data.error).toBeUndefined();
        expect(data.actualOutput).toBeUndefined();
        expect(data.responseTime).toBeUndefined();
        expect(data.tokenUsage).toBeUndefined();
        expect(data.scores).toEqual([]);
        expect(data.totalScore).toBe(0);
        expect(data.passed).toBe(false);
        expect(data.startTime).toBeUndefined();
        expect(data.completeTime).toBeUndefined();
      });

      it('超过最大重试次数应该返回错误', async () => {
        const item = await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '问题',
          status: 'failed',
          retryCount: 3
        });

        const response = await callApi(retryItemHandler, {
          method: 'POST',
          auth,
          body: { itemId: item._id.toString() }
        });

        expectError(response);
      });

      it('重试其他团队的评估项目应该返回权限错误', async () => {
        // 创建另一个团队的评估任务和项目
        const otherContext = await createTestContext(testDataFactory);
        const otherApp = await testDataFactory.createApp({
          teamId: otherContext.teamId,
          tmbId: otherContext.tmbId,
          name: '其他团队应用'
        });
        const otherEvaluation = await testDataFactory.createEvaluation({
          teamId: otherContext.teamId,
          tmbId: otherContext.tmbId,
          appId: otherApp._id.toString(),
          name: '其他团队评估'
        });
        const otherItem = await testDataFactory.createEvaluationItem({
          evaluationId: otherEvaluation._id.toString(),
          input: '其他团队问题',
          status: 'failed'
        });

        // 使用当前团队的认证尝试重试其他团队的项目
        const response = await callApi(retryItemHandler, {
          method: 'POST',
          auth,
          body: { itemId: otherItem._id.toString() }
        });

        expectError(response);
      });
    });

    describe('POST /api/core/app/evaluation/updateItem', () => {
      it('应该成功更新评估项目评分（无metrics配置时使用简单平均）', async () => {
        const item = await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '问题',
          status: 'completed'
        });

        const response = await callApi(updateItemHandler, {
          method: 'POST',
          auth,
          body: {
            itemId: item._id.toString(),
            scores: [
              { metric: 'accuracy', score: 0.9, reason: '回答准确' },
              { metric: 'relevance', score: 0.8, reason: '相关性高' }
            ],
            passed: true
          }
        });

        const data = expectSuccess(response);
        expect(data.scores).toHaveLength(2);
        expect(data.passed).toBe(true);
        // 无 metrics 配置时使用简单平均: (0.9 + 0.8) / 2 = 0.85
        expect(data.totalScore).toBeCloseTo(0.85);
      });

      it('应该成功更新通过状态', async () => {
        const item = await testDataFactory.createEvaluationItem({
          evaluationId,
          input: '问题',
          status: 'completed',
          passed: false
        });

        const response = await callApi(updateItemHandler, {
          method: 'POST',
          auth,
          body: {
            itemId: item._id.toString(),
            passed: true
          }
        });

        const data = expectSuccess(response);
        expect(data.passed).toBe(true);
      });

      it('更新其他团队的评估项目应该返回权限错误', async () => {
        // 创建另一个团队的评估任务和项目
        const otherContext = await createTestContext(testDataFactory);
        const otherApp = await testDataFactory.createApp({
          teamId: otherContext.teamId,
          tmbId: otherContext.tmbId,
          name: '其他团队应用'
        });
        const otherEvaluation = await testDataFactory.createEvaluation({
          teamId: otherContext.teamId,
          tmbId: otherContext.tmbId,
          appId: otherApp._id.toString(),
          name: '其他团队评估'
        });
        const otherItem = await testDataFactory.createEvaluationItem({
          evaluationId: otherEvaluation._id.toString(),
          input: '其他团队问题',
          status: 'completed'
        });

        // 使用当前团队的认证尝试更新其他团队的项目
        const response = await callApi(updateItemHandler, {
          method: 'POST',
          auth,
          body: {
            itemId: otherItem._id.toString(),
            passed: true
          }
        });

        expectError(response);
      });
    });
  });
});
