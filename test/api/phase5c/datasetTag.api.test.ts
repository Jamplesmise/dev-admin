/**
 * Phase 5C - 数据集标签 API 测试
 *
 * 测试范围:
 * - POST /api/core/dataset/tag/create
 * - DELETE /api/core/dataset/tag/delete
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { connectTestDB, disconnectTestDB } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';
import createHandler from '../../../pages/api/core/dataset/tag/create';
import deleteHandler from '../../../pages/api/core/dataset/tag/delete';
import { MongoDatasetTagModel } from '@fastgpt/service/core/dataset/tag/schema';

describe('Phase 5C - 数据集标签 API', () => {
  const testTeamId = '507f1f77bcf86cd799439012';
  const testTmbId = '507f1f77bcf86cd799439013';
  const testUserId = '507f1f77bcf86cd799439011';
  const testDatasetId = '507f1f77bcf86cd799439020';
  const otherTeamId = '507f1f77bcf86cd799439099';

  const defaultAuth = {
    userId: testUserId,
    teamId: testTeamId,
    tmbId: testTmbId
  };

  // 数据库连接
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  // 清理测试数据
  beforeEach(async () => {
    await MongoDatasetTagModel.deleteMany({ teamId: testTeamId });
    await MongoDatasetTagModel.deleteMany({ teamId: otherTeamId });
  });

  afterEach(async () => {
    await MongoDatasetTagModel.deleteMany({ teamId: testTeamId });
    await MongoDatasetTagModel.deleteMany({ teamId: otherTeamId });
  });

  describe('POST /api/core/dataset/tag/create', () => {
    it('应成功创建标签', async () => {
      const res = await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          datasetId: testDatasetId,
          name: '测试标签'
        }
      });

      const data = expectSuccess(res);
      expect(data.tagId).toBeDefined();
      expect(data.name).toBe('测试标签');
    });

    it('重复名称应返回错误', async () => {
      // 先创建一个标签
      await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          datasetId: testDatasetId,
          name: '重复标签'
        }
      });

      // 再次创建同名标签
      const res = await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          datasetId: testDatasetId,
          name: '重复标签'
        }
      });

      expectError(res, 500);
    });

    it('名称过长应返回错误', async () => {
      const res = await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          datasetId: testDatasetId,
          name: 'a'.repeat(51)
        }
      });

      expectError(res, 500);
    });

    it('名称为空应返回错误', async () => {
      const res = await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          datasetId: testDatasetId,
          name: ''
        }
      });

      expectError(res, 500);
    });

    it('缺少 datasetId 应返回错误', async () => {
      const res = await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          name: '测试标签'
        }
      });

      expectError(res, 500);
    });

    it('应去除名称前后空格', async () => {
      const res = await callApi(createHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          datasetId: testDatasetId,
          name: '  带空格的标签  '
        }
      });

      const data = expectSuccess(res);
      expect(data.name).toBe('带空格的标签');
    });
  });

  describe('DELETE /api/core/dataset/tag/delete', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await MongoDatasetTagModel.create({
        teamId: testTeamId,
        datasetId: testDatasetId,
        name: '待删除标签'
      });
      tagId = tag._id.toString();
    });

    it('应成功删除标签', async () => {
      const res = await callApi(deleteHandler, {
        method: 'DELETE',
        auth: defaultAuth,
        query: { tagId }
      });

      const data = expectSuccess(res);
      expect(data.success).toBe(true);

      // 验证已删除
      const deletedTag = await MongoDatasetTagModel.findById(tagId);
      expect(deletedTag).toBeNull();
    });

    it('删除不存在的标签应返回错误', async () => {
      const res = await callApi(deleteHandler, {
        method: 'DELETE',
        auth: defaultAuth,
        query: { tagId: '507f1f77bcf86cd799439999' }
      });

      expectError(res, 500);
    });

    it('不能删除其他团队的标签', async () => {
      const otherTag = await MongoDatasetTagModel.create({
        teamId: otherTeamId,
        datasetId: testDatasetId,
        name: '其他团队标签'
      });

      const res = await callApi(deleteHandler, {
        method: 'DELETE',
        auth: defaultAuth,
        query: { tagId: otherTag._id.toString() }
      });

      expectError(res, 500);
    });

    it('缺少 tagId 应返回错误', async () => {
      const res = await callApi(deleteHandler, {
        method: 'DELETE',
        auth: defaultAuth,
        query: {}
      });

      expectError(res, 500);
    });
  });
});
