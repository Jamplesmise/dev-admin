/**
 * 成员分组 API 集成测试
 * 测试所有 Group 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import listHandler from '@/api/support/user/team/group/list';
import createHandler from '@/api/support/user/team/group/create';
import updateHandler from '@/api/support/user/team/group/update';
import deleteHandler from '@/api/support/user/team/group/delete';

describe('成员分组 API 测试', () => {
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
  });

  describe('GET /api/support/user/team/group/list', () => {
    it('应该返回空列表当没有分组时', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('应该返回所有分组', async () => {
      // 创建测试分组
      await testDataFactory.createMemberGroup({ teamId, name: '前端组' });
      await testDataFactory.createMemberGroup({ teamId, name: '后端组' });
      await testDataFactory.createMemberGroup({ teamId, name: '测试组' });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data).toHaveLength(3);
    });

    it('应该支持按名称搜索', async () => {
      await testDataFactory.createMemberGroup({ teamId, name: '前端开发组' });
      await testDataFactory.createMemberGroup({ teamId, name: '后端开发组' });
      await testDataFactory.createMemberGroup({ teamId, name: '测试组' });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { searchKey: '开发' }
      });

      const data = expectSuccess(response);
      expect(data).toHaveLength(2);
    });

    it('应该返回分组包含 memberCount 字段', async () => {
      await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ memberCount: number; name: string }[]>(response);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('测试分组');
      // memberCount 字段存在且为数字
      expect(typeof data[0].memberCount).toBe('number');
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        skipAuthMock: true // 测试真实认证逻辑
      });

      expectError(response);
    });

    it('不同团队的分组应该隔离', async () => {
      // 当前团队创建分组
      await testDataFactory.createMemberGroup({ teamId, name: '当前团队分组' });

      // 创建另一个团队及其分组
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      await testDataFactory.createMemberGroup({
        teamId: team2._id.toString(),
        name: '另一个团队分组'
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ name: string }[]>(response);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('当前团队分组');
    });
  });

  describe('POST /api/support/user/team/group/create', () => {
    it('应该成功创建分组', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '新分组'
        }
      });

      const data = expectSuccess<{ name: string; _id: string }>(response);
      expect(data.name).toBe('新分组');
      expect(data._id).toBeDefined();
    });

    it('应该创建带头像的分组', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '带头像分组',
          avatar: 'https://example.com/avatar.png'
        }
      });

      const data = expectSuccess<{ avatar: string }>(response);
      expect(data.avatar).toBe('https://example.com/avatar.png');
    });

    it('应该创建分组并添加初始成员', async () => {
      // 使用已有的 tmbId 作为初始成员
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '带成员的分组',
          memberIdList: [tmbId]
        }
      });

      const data = expectSuccess<{ _id: string }>(response);
      expect(data._id).toBeDefined();
    });

    it('分组名称不能为空', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: ''
        }
      });

      expectError(response);
    });

    it('不能创建同名分组', async () => {
      await testDataFactory.createMemberGroup({ teamId, name: '已存在分组' });

      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '已存在分组'
        }
      });

      expectError(response);
    });
  });

  describe('PUT /api/support/user/team/group/update', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '原始分组名'
      });
      groupId = group._id.toString();
    });

    it('应该成功更新分组名称', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          groupId,
          name: '新分组名'
        }
      });

      const data = expectSuccess<{ name: string }>(response);
      expect(data.name).toBe('新分组名');
    });

    it('应该成功更新分组头像', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          groupId,
          avatar: 'https://new-avatar.com/image.png'
        }
      });

      const data = expectSuccess<{ avatar: string }>(response);
      expect(data.avatar).toBe('https://new-avatar.com/image.png');
    });

    it('应该成功更新分组成员', async () => {
      // 使用已存在的成员 tmbId 来更新
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          groupId,
          memberList: [
            { tmbId, role: 'member' }
          ]
        }
      });

      const data = expectSuccess(response);
      expect(data).toBeDefined();
    });

    it('缺少 groupId 应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          name: '新名称'
        }
      });

      expectError(response);
    });

    it('分组不存在应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          groupId: '507f1f77bcf86cd799439011',
          name: '新名称'
        }
      });

      expectError(response);
    });

    it('更新为空名称应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          groupId,
          name: ''
        }
      });

      expectError(response);
    });

    it('不能更新为已存在的分组名称', async () => {
      await testDataFactory.createMemberGroup({ teamId, name: '另一个分组' });

      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          groupId,
          name: '另一个分组'
        }
      });

      expectError(response);
    });
  });

  describe('DELETE /api/support/user/team/group/delete', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '待删除分组'
      });
      groupId = group._id.toString();
    });

    it('应该成功删除分组', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { groupId }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);

      // 验证分组已删除
      const listResponse = await callApi(listHandler, {
        method: 'GET',
        auth
      });
      const listData = expectSuccess(listResponse);
      expect(listData).toHaveLength(0);
    });

    it('删除分组应该同时删除成员关系', async () => {
      // 添加成员
      await testDataFactory.createGroupMember({
        teamId,
        groupId,
        tmbId
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { groupId }
      });

      const data = expectSuccess<{ deletedMemberCount: number }>(response);
      expect(data.deletedMemberCount).toBe(1);
    });

    it('缺少 groupId 应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth
      });

      expectError(response);
    });

    it('分组不存在应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { groupId: '507f1f77bcf86cd799439011' }
      });

      expectError(response);
    });

    it('不能删除其他团队的分组', async () => {
      // 创建另一个团队的分组
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      const otherGroup = await testDataFactory.createMemberGroup({
        teamId: team2._id.toString(),
        name: '其他团队分组'
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        query: { groupId: otherGroup._id.toString() }
      });

      expectError(response);
    });
  });
});
