/**
 * 应用协作者 API 集成测试
 * 测试所有 App Collaborator 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import listHandler from '@/api/core/app/collaborator/list';
import updateHandler from '@/api/core/app/collaborator/update';
import deleteHandler from '@/api/core/app/collaborator/delete';

describe('应用协作者 API 测试', () => {
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

  describe('GET /api/core/app/collaborator/list', () => {
    it('应该返回空列表当没有协作者时', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { resourceId: appId }
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('应该返回所有协作者', async () => {
      // 创建协作者（成员类型）
      const user2 = await testDataFactory.createUser({ username: '协作者1' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者1'
      });
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: 4 // 只读
      });

      // 创建协作者（分组类型）
      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        groupId: group._id.toString(),
        permission: 6 // 读写
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { resourceId: appId }
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

    it('未认证时应该返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        query: { resourceId: appId },
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response);
    });

    it('不同团队的协作者应该隔离', async () => {
      // 当前团队创建协作者
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: 4
      });

      // 创建另一个团队的应用和协作者
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });
      const app2 = await testDataFactory.createApp({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        name: '另一个应用'
      });
      await testDataFactory.createCollaborator({
        teamId: team2._id.toString(),
        resourceId: app2._id.toString(),
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: 4
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { resourceId: appId }
      });

      const data = expectSuccess(response);
      expect(data).toHaveLength(1);
    });
  });

  describe('PUT /api/core/app/collaborator/update', () => {
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
          resourceId: appId,
          collaborators: [
            { type: 'member', targetId: member2._id.toString(), permission: 4 }
          ]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功添加分组协作者', async () => {
      const group = await testDataFactory.createMemberGroup({ teamId, name: '协作分组' });

      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          resourceId: appId,
          collaborators: [
            { type: 'group', targetId: group._id.toString(), permission: 6 }
          ]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功更新协作者权限', async () => {
      // 先添加协作者
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: 4
      });

      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          resourceId: appId,
          collaborators: [
            { type: 'member', targetId: tmbId, permission: 7 } // 更新为全部权限
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

    it('缺少 collaborators 应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          resourceId: appId
        }
      });

      expectError(response);
    });
  });

  describe('DELETE /api/core/app/collaborator/delete', () => {
    let collaboratorId: string;

    beforeEach(async () => {
      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
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
          resourceId: appId,
          collaboratorIds: [collaboratorId]
        }
      });

      const data = expectSuccess<{ success: boolean; deletedCount: number }>(response);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(1);
    });

    it('应该成功批量删除协作者', async () => {
      // 创建另一个协作者
      const user2 = await testDataFactory.createUser({ username: '协作者2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者2'
      });
      const collaborator2 = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: 4
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          resourceId: appId,
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

    it('缺少 collaboratorIds 应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          resourceId: appId
        }
      });

      expectError(response);
    });

    it('空 collaboratorIds 列表应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: {
          resourceId: appId,
          collaboratorIds: []
        }
      });

      expectError(response);
    });
  });
});
