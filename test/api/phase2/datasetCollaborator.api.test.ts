/**
 * 数据集协作者 API 集成测试
 * 测试所有 Dataset Collaborator 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import listHandler from '@/api/core/dataset/collaborator/list';
import updateHandler from '@/api/core/dataset/collaborator/update';
import deleteHandler from '@/api/core/dataset/collaborator/delete';

describe('数据集协作者 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let auth: AuthHeaders;
  let datasetId: string;

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

    // 创建测试数据集
    const dataset = await testDataFactory.createDataset({
      teamId,
      tmbId,
      name: '测试数据集'
    });
    datasetId = dataset._id.toString();
  });

  describe('GET /api/core/dataset/collaborator/list', () => {
    it('应该返回空列表当没有协作者时', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { resourceId: datasetId }
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('应该返回所有协作者', async () => {
      // 创建成员协作者
      const user2 = await testDataFactory.createUser({ username: '协作者1' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者1'
      });
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId: member2._id.toString(),
        permission: 4
      });

      // 创建分组协作者
      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        groupId: group._id.toString(),
        permission: 6
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { resourceId: datasetId }
      });

      const data = expectSuccess(response);
      expect(data).toHaveLength(2);
    });

    it('缺少 resourceId 应该返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      expectError(response);
    });

    it('不同资源类型的协作者应该隔离', async () => {
      // 创建数据集协作者
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId,
        permission: 4
      });

      // 创建应用及其协作者（不同资源类型）
      const app = await testDataFactory.createApp({
        teamId,
        tmbId,
        name: '测试应用'
      });
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: app._id.toString(),
        resourceType: 'app',
        tmbId,
        permission: 4
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { resourceId: datasetId }
      });

      const data = expectSuccess(response);
      expect(data).toHaveLength(1);
    });
  });

  describe('PUT /api/core/dataset/collaborator/update', () => {
    it('应该成功添加成员协作者', async () => {
      const user2 = await testDataFactory.createUser({ username: '新协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '新协作者'
      });

      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          resourceId: datasetId,
          collaborators: [
            { type: 'member', targetId: member2._id.toString(), permission: 4 }
          ]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功添加组织协作者', async () => {
      // 创建组织
      const org = await testDataFactory.createOrg({
        teamId,
        name: '协作组织'
      });

      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          resourceId: datasetId,
          collaborators: [
            { type: 'org', targetId: org._id.toString(), permission: 4 }
          ]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功更新协作者权限', async () => {
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId,
        permission: 4
      });

      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          resourceId: datasetId,
          collaborators: [
            { type: 'member', targetId: tmbId, permission: 7 }
          ]
        }
      });

      const data = expectSuccess<{ updatedCount: number }>(response);
      expect(data.updatedCount).toBe(1);
    });

    it('缺少 resourceId 应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          collaborators: []
        }
      });

      expectError(response);
    });
  });

  describe('DELETE /api/core/dataset/collaborator/delete', () => {
    let collaboratorId: string;

    beforeEach(async () => {
      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId,
        permission: 4
      });
      collaboratorId = collaborator._id.toString();
    });

    it('应该成功删除协作者', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          resourceId: datasetId,
          collaboratorIds: [collaboratorId]
        }
      });

      const data = expectSuccess<{ success: boolean; deletedCount: number }>(response);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(1);
    });

    it('应该成功批量删除协作者', async () => {
      const user2 = await testDataFactory.createUser({ username: '协作者2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者2'
      });
      const collaborator2 = await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId: member2._id.toString(),
        permission: 4
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          resourceId: datasetId,
          collaboratorIds: [collaboratorId, collaborator2._id.toString()]
        }
      });

      const data = expectSuccess<{ deletedCount: number }>(response);
      expect(data.deletedCount).toBe(2);
    });

    it('缺少 resourceId 应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          collaboratorIds: [collaboratorId]
        }
      });

      expectError(response);
    });

    it('空 collaboratorIds 列表应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          resourceId: datasetId,
          collaboratorIds: []
        }
      });

      expectError(response);
    });
  });
});
