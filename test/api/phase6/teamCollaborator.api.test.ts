/**
 * 团队协作者 API 测试
 * /api/support/user/team/collaborator/*
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearAllTestCollections,
  testDataFactory
} from '../../utils/db';
import {
  callApi,
  expectSuccess,
  expectError,
  createTestContext,
  type AuthHeaders
} from '../../utils/apiTestHelper';

// 导入 handlers
import listHandler from '@/api/support/user/team/collaborator/list';
import updateHandler from '@/api/support/user/team/collaborator/update';
import updateOneHandler from '@/api/support/user/team/collaborator/updateOne';
import deleteHandler from '@/api/support/user/team/collaborator/delete';

describe('团队协作者 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
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
    userId = context.userId;
    auth = context.auth;

    // 将当前成员设置为 owner（用于测试权限验证）
    const { MongoTeamMemberModel } = await import(
      '../../../src/packages/service/support_user/team/teamMemberSchema'
    );
    await MongoTeamMemberModel.updateOne({ _id: tmbId }, { $set: { role: 'owner' } });
  });

  describe('GET /api/support/user/team/collaborator/list', () => {
    it('应该返回空列表当没有协作者时', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ clbs: unknown[] }>(response);
      expect(data.clbs).toHaveLength(0);
    });

    it('应该返回团队协作者列表', async () => {
      // 创建一个成员类型的协作者
      const user2 = await testDataFactory.createUser({ username: '协作者1' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者1'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: member2._id.toString(),
        permission: 4 // 只读
      });

      // 创建一个分组类型的协作者
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '测试分组'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        groupId: group._id.toString(),
        permission: 6 // 读写
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{
        clbs: { type: string; permission: number; name: string }[];
      }>(response);

      expect(data.clbs).toHaveLength(2);
      expect(data.clbs.some((c) => c.type === 'member' && c.permission === 4)).toBe(true);
      expect(data.clbs.some((c) => c.type === 'group' && c.permission === 6)).toBe(true);
    });

    it('应该包含协作者的名称', async () => {
      const user2 = await testDataFactory.createUser({ username: '测试协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '测试协作者名称'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: member2._id.toString(),
        permission: 4
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ clbs: { name: string }[] }>(response);

      expect(data.clbs[0].name).toBe('测试协作者名称');
    });

    it('未认证请求应返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        skipAuthMock: true
      });

      expectError(response);
    });
  });

  describe('POST /api/support/user/team/collaborator/update', () => {
    it('应该成功添加成员协作者', async () => {
      const user2 = await testDataFactory.createUser({ username: '新协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '新协作者'
      });

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [{ tmbId: member2._id.toString(), permission: 4 }]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功添加分组协作者', async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '协作分组'
      });

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [{ groupId: group._id.toString(), permission: 6 }]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功添加组织协作者', async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '协作组织',
        path: '/协作组织'
      });

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [{ orgId: org._id.toString(), permission: 7 }]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功更新现有协作者权限', async () => {
      // 先创建协作者
      const user2 = await testDataFactory.createUser({ username: '协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: member2._id.toString(),
        permission: 4
      });

      // 更新权限
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [{ tmbId: member2._id.toString(), permission: 7 }]
        }
      });

      const data = expectSuccess<{ updatedCount: number }>(response);
      expect(data.updatedCount).toBe(1);
    });

    it('空 collaborators 列表应返回成功', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: []
        }
      });

      const data = expectSuccess<{ addedCount: number; updatedCount: number }>(response);
      expect(data.addedCount).toBe(0);
      expect(data.updatedCount).toBe(0);
    });

    it('无效的权限值应返回错误', async () => {
      const user2 = await testDataFactory.createUser({ username: '协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者'
      });

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [{ tmbId: member2._id.toString(), permission: 999 }]
        }
      });

      expectError(response);
    });

    it('不能同时指定多个协作者标识', async () => {
      const user2 = await testDataFactory.createUser({ username: '协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者'
      });

      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '分组'
      });

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [
            {
              tmbId: member2._id.toString(),
              groupId: group._id.toString(),
              permission: 4
            }
          ]
        }
      });

      expectError(response);
    });

    it('不能修改 owner 的权限', async () => {
      // 当前用户是 owner，尝试修改自己的权限
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          collaborators: [{ tmbId: tmbId, permission: 4 }]
        }
      });

      expectError(response);
    });

    it('普通成员不能更新协作者权限', async () => {
      // 创建一个普通成员
      const user2 = await testDataFactory.createUser({ username: '普通成员' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '普通成员',
        role: 'member'
      });

      const memberAuth: AuthHeaders = {
        teamId,
        tmbId: member2._id.toString(),
        userId: user2._id.toString()
      };

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth: memberAuth,
        body: {
          collaborators: [{ tmbId: tmbId, permission: 4 }]
        }
      });

      expectError(response);
    });
  });

  describe('PUT /api/support/user/team/collaborator/updateOne', () => {
    it('应该更新单个协作者权限', async () => {
      // 创建协作者
      const user2 = await testDataFactory.createUser({ username: '协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '协作者'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: member2._id.toString(),
        permission: 4
      });

      const response = await callApi(updateOneHandler, {
        method: 'PUT',
        auth,
        body: {
          tmbId: member2._id.toString(),
          permission: 6
        }
      });

      expectSuccess(response);
    });

    it('协作者不存在时返回错误', async () => {
      const response = await callApi(updateOneHandler, {
        method: 'PUT',
        auth,
        body: {
          tmbId: testDataFactory.randomObjectId(),
          permission: 6
        }
      });

      expectError(response);
    });

    it('不能修改 owner 权限', async () => {
      // 先为 owner 创建一个协作者记录
      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: tmbId,
        permission: 7
      });

      const response = await callApi(updateOneHandler, {
        method: 'PUT',
        auth,
        body: {
          tmbId: tmbId,
          permission: 4
        }
      });

      expectError(response);
    });
  });

  describe('DELETE /api/support/user/team/collaborator/delete', () => {
    it('应该成功删除协作者', async () => {
      // 创建协作者
      const user2 = await testDataFactory.createUser({ username: '待删除协作者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '待删除协作者'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: member2._id.toString(),
        permission: 4
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { tmbId: member2._id.toString() }
      });

      expectSuccess(response);

      // 验证已删除
      const listResponse = await callApi(listHandler, {
        method: 'GET',
        auth
      });
      const data = expectSuccess<{ clbs: unknown[] }>(listResponse);
      expect(data.clbs).toHaveLength(0);
    });

    it('删除不存在的协作者应该成功（幂等）', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { tmbId: testDataFactory.randomObjectId() }
      });

      // 删除操作是幂等的，即使不存在也返回成功
      expectSuccess(response);
    });

    it('不能删除 owner', async () => {
      // 先为 owner 创建协作者记录
      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: tmbId,
        permission: 7
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { tmbId: tmbId }
      });

      expectError(response);
    });

    it('必须指定一个协作者标识', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: {}
      });

      expectError(response);
    });

    it('普通成员不能删除协作者', async () => {
      // 创建一个普通成员
      const user2 = await testDataFactory.createUser({ username: '普通成员' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '普通成员',
        role: 'member'
      });

      // 创建要删除的协作者
      const user3 = await testDataFactory.createUser({ username: '协作者' });
      const member3 = await testDataFactory.createTeamMember({
        teamId,
        userId: user3._id.toString(),
        name: '协作者'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceType: 'team',
        tmbId: member3._id.toString(),
        permission: 4
      });

      const memberAuth: AuthHeaders = {
        teamId,
        tmbId: member2._id.toString(),
        userId: user2._id.toString()
      };

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth: memberAuth,
        query: { tmbId: member3._id.toString() }
      });

      expectError(response);
    });
  });
});
