/**
 * 应用评估创建 API 集成测试
 * 测试 Phase 6C 创建评估相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import createHandler from '@/api/core/app/evaluation/create';

describe('应用评估创建 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
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
    userId = context.userId;
    auth = context.auth;

    // 创建测试应用
    const app = await testDataFactory.createApp({
      teamId,
      tmbId,
      name: '测试应用'
    });
    appId = app._id.toString();
  });

  describe('POST /api/core/app/evaluation/create', () => {
    it('应该成功创建评估任务', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          description: '这是一个测试评估任务',
          testCases: [
            { input: '你好', expectedOutput: '你好！有什么可以帮助您的？' },
            { input: '今天天气怎么样', expectedOutput: '我无法获取实时天气信息' }
          ]
        }
      });

      const data = expectSuccess<{ evaluationId: string }>(response);
      expect(data.evaluationId).toBeTruthy();
    });

    it('应该创建对应的评估项目', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          testCases: [
            { input: '问题1' },
            { input: '问题2' },
            { input: '问题3' }
          ]
        }
      });

      const data = expectSuccess<{ evaluationId: string }>(response);

      // 验证评估项目已创建
      const { MongoEvaluationItemModel } = await import(
        '../../../src/packages/service/core/app/evaluation/itemSchema'
      );
      const items = await MongoEvaluationItemModel.find({
        evaluationId: data.evaluationId
      }).lean();

      expect(items).toHaveLength(3);
      expect(items.map(i => i.input).sort()).toEqual(['问题1', '问题2', '问题3'].sort());
    });

    it('应该支持自定义评估模型', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          evaluatorModel: 'gpt-3.5-turbo',
          testCases: [{ input: '测试' }]
        }
      });

      const data = expectSuccess<{ evaluationId: string }>(response);

      // 验证评估模型
      const { MongoEvaluationModel } = await import(
        '../../../src/packages/service/core/app/evaluation/schema'
      );
      const evaluation = await MongoEvaluationModel.findById(data.evaluationId).lean();
      expect(evaluation?.evaluatorModel).toBe('gpt-3.5-turbo');
    });

    it('应该支持自定义评估指标', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          metrics: [
            { name: 'accuracy', weight: 2, threshold: 0.8 },
            { name: 'relevance', weight: 1, threshold: 0.6 }
          ],
          testCases: [{ input: '测试' }]
        }
      });

      const data = expectSuccess<{ evaluationId: string }>(response);

      // 验证评估指标
      const { MongoEvaluationModel } = await import(
        '../../../src/packages/service/core/app/evaluation/schema'
      );
      const evaluation = await MongoEvaluationModel.findById(data.evaluationId).lean();
      expect(evaluation?.metrics).toHaveLength(2);
      expect(evaluation?.metrics[0].name).toBe('accuracy');
      expect(evaluation?.metrics[0].weight).toBe(2);
    });

    it('缺少 appId 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '测试评估',
          testCases: [{ input: '测试' }]
        }
      });

      expectError(response);
    });

    it('缺少 name 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          testCases: [{ input: '测试' }]
        }
      });

      expectError(response);
    });

    it('空名称应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '   ',
          testCases: [{ input: '测试' }]
        }
      });

      expectError(response);
    });

    it('名称超过长度限制应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: 'a'.repeat(101), // 超过 100 字符
          testCases: [{ input: '测试' }]
        }
      });

      expectError(response);
    });

    it('描述超过长度限制应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          description: 'a'.repeat(501), // 超过 500 字符
          testCases: [{ input: '测试' }]
        }
      });

      expectError(response);
    });

    it('空测试用例应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          testCases: []
        }
      });

      expectError(response);
    });

    it('测试用例缺少 input 应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          testCases: [{ expectedOutput: '输出' }]
        }
      });

      expectError(response);
    });

    it('测试用例 input 超过长度限制应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          testCases: [{ input: 'a'.repeat(5001) }] // 超过 5000 字符
        }
      });

      expectError(response);
    });

    it('创建的评估任务状态应该是 pending', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估状态',
          testCases: [{ input: '测试状态' }]
        }
      });

      const data = expectSuccess<{ evaluationId: string }>(response);
      expect(data.evaluationId).toBeTruthy();

      // 使用 connectionMongo 查询确保使用同一连接
      const { connectionMongo } = await import(
        '../../../src/packages/service/common/mongo'
      );
      const evaluation = await connectionMongo.connection
        .collection('evaluations')
        .findOne({ _id: new (await import('mongoose')).Types.ObjectId(data.evaluationId) });

      expect(evaluation?.status).toBe('pending');
      expect(evaluation?.progress).toBe(0);
      expect(evaluation?.totalItems).toBe(1);
    });

    it('评估项目状态应该是 pending', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          appId,
          name: '测试评估',
          testCases: [{ input: '测试' }]
        }
      });

      const data = expectSuccess<{ evaluationId: string }>(response);

      // 使用 connectionMongo 查询确保使用同一连接
      const { connectionMongo } = await import(
        '../../../src/packages/service/common/mongo'
      );
      const items = await connectionMongo.connection
        .collection('evaluation_items')
        .find({ evaluationId: new (await import('mongoose')).Types.ObjectId(data.evaluationId) })
        .toArray();

      expect(items[0].status).toBe('pending');
      expect(items[0].retryCount).toBe(0);
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        skipAuthMock: true,
        body: {
          appId,
          name: '测试评估',
          testCases: [{ input: '测试' }]
        }
      });

      expectError(response);
    });
  });
});
