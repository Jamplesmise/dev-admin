/**
 * 组织架构 API 集成测试
 * 测试所有 Organization 相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory, getTestModels } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import createHandler from '@/api/support/user/team/org/create';
import listHandler from '@/api/support/user/team/org/list';
import updateHandler from '@/api/support/user/team/org/update';
import deleteHandler from '@/api/support/user/team/org/delete';
import moveHandler from '@/api/support/user/team/org/move';
import updateMembersHandler from '@/api/support/user/team/org/updateMembers';
import deleteMemberHandler from '@/api/support/user/team/org/deleteMember';

describe('组织架构 API 测试', () => {
  let teamId: string;
  let tmbId: string;
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
    auth = context.auth;
  });

  describe('POST /api/support/user/team/org/create', () => {
    it('应该成功创建根级组织', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '技术部'
        }
      });

      const data = expectSuccess<{ _id: string; name: string; path: string }>(response);
      expect(data._id).toBeDefined();
      expect(data.name).toBe('技术部');
      expect(data.path).toBe('');
    });

    it('应该成功创建子组织', async () => {
      // 先创建父组织
      const parentOrg = await testDataFactory.createOrg({
        teamId,
        name: '技术部'
      });

      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          parentId: parentOrg._id.toString(),
          name: '前端组'
        }
      });

      const data = expectSuccess<{ path: string; name: string }>(response);
      // path 应该包含父组织的 pathId
      expect(data.path).toBeDefined();
      expect(data.path.length).toBeGreaterThan(0);
      expect(data.name).toBe('前端组');
    });

    it('应该创建带描述的组织', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '技术部',
          description: '负责技术研发'
        }
      });

      const data = expectSuccess<{ description: string }>(response);
      expect(data.description).toBe('负责技术研发');
    });

    it('组织名称不能为空', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: ''
        }
      });

      expectError(response);
    });

    it('同级不能创建同名组织', async () => {
      await testDataFactory.createOrg({
        teamId,
        name: '技术部'
      });

      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          name: '技术部'
        }
      });

      expectError(response);
    });

    it('父组织不存在应该返回错误', async () => {
      const response = await callApi(createHandler, {
        method: 'POST',
        auth,
        body: {
          parentId: '507f1f77bcf86cd799439011',
          name: '前端组'
        }
      });

      expectError(response);
    });
  });

  describe('GET /api/support/user/team/org/list', () => {
    it('应该返回空列表当没有组织时', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('应该返回根级组织', async () => {
      await testDataFactory.createOrg({ teamId, name: '技术部' });
      await testDataFactory.createOrg({ teamId, name: '产品部' });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data).toHaveLength(2);
    });

    it('应该返回子组织', async () => {
      const parentOrg = await testDataFactory.createOrg({ teamId, name: '技术部' });

      // 使用 API 创建子组织以确保 path 正确
      await callApi(createHandler, {
        method: 'POST',
        auth,
        body: { parentId: parentOrg._id.toString(), name: '前端组' }
      });
      await callApi(createHandler, {
        method: 'POST',
        auth,
        body: { parentId: parentOrg._id.toString(), name: '后端组' }
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { parentId: parentOrg._id.toString() }
      });

      const data = expectSuccess<{ name: string }[]>(response);
      expect(data).toHaveLength(2);
    });

    it('应该返回组织成员数和子组织数', async () => {
      const org = await testDataFactory.createOrg({ teamId, name: '技术部' });

      // 添加成员
      await testDataFactory.createOrgMember({
        teamId,
        orgId: org._id.toString(),
        tmbId
      });

      // 使用 API 创建子组织以确保 path 正确
      await callApi(createHandler, {
        method: 'POST',
        auth,
        body: { parentId: org._id.toString(), name: '前端组' }
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ total: number }[]>(response);
      expect(data[0].total).toBe(2); // 1 成员 + 1 子组织
    });

    it('父组织不存在应该返回错误', async () => {
      const response = await callApi(listHandler, {
        method: 'GET',
        auth,
        query: { parentId: '507f1f77bcf86cd799439011' }
      });

      expectError(response);
    });
  });

  describe('PUT /api/support/user/team/org/update', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '原名称'
      });
      orgId = org._id.toString();
    });

    it('应该成功更新组织名称', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId,
          name: '新名称'
        }
      });

      const data = expectSuccess<{ name: string }>(response);
      expect(data.name).toBe('新名称');
    });

    it('应该成功更新组织描述', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId,
          description: '新描述'
        }
      });

      const data = expectSuccess<{ description: string }>(response);
      expect(data.description).toBe('新描述');
    });

    it('缺少 orgId 应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          name: '新名称'
        }
      });

      expectError(response);
    });

    it('组织不存在应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId: '507f1f77bcf86cd799439011',
          name: '新名称'
        }
      });

      expectError(response);
    });
  });

  describe('DELETE /api/support/user/team/org/delete', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '待删除组织'
      });
      orgId = org._id.toString();
    });

    it('应该成功删除空组织', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: { orgId }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('删除组织应该同时删除成员关系', async () => {
      await testDataFactory.createOrgMember({
        teamId,
        orgId,
        tmbId
      });

      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: { orgId }
      });

      expectSuccess(response);

      // 验证成员关系已删除 - 使用 API Model
      const { MongoOrgMemberModel } = await import(
        '@/packages/service/support_permission/org/orgMemberSchema'
      );
      const count = await MongoOrgMemberModel.countDocuments({ orgId });
      expect(count).toBe(0);
    });

    it('缺少 orgId 应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth
      });

      expectError(response);
    });

    it('组织不存在应该返回错误', async () => {
      const response = await callApi(deleteHandler, {
        method: 'DELETE',
        auth,
        body: { orgId: '507f1f77bcf86cd799439011' }
      });

      expectError(response);
    });
  });

  describe('PUT /api/support/user/team/org/move', () => {
    it('应该成功移动组织到新的父组织', async () => {
      const org = await testDataFactory.createOrg({ teamId, name: '待移动组织' });
      const newParent = await testDataFactory.createOrg({ teamId, name: '新父组织' });

      const response = await callApi(moveHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId: org._id.toString(),
          targetParentId: newParent._id.toString()
        }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('应该成功移动组织到根级', async () => {
      const parent = await testDataFactory.createOrg({ teamId, name: '父组织' });
      const org = await testDataFactory.createOrg({
        teamId,
        name: '子组织',
        path: `/${parent._id}`
      });

      const response = await callApi(moveHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId: org._id.toString()
          // 不传 targetParentId 表示移动到根级
        }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);
    });

    it('缺少 orgId 应该返回错误', async () => {
      const response = await callApi(moveHandler, {
        method: 'PUT',
        auth,
        body: {}
      });

      expectError(response);
    });
  });

  describe('PUT /api/support/user/team/org/updateMembers', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await testDataFactory.createOrg({ teamId, name: '测试组织' });
      orgId = org._id.toString();
    });

    it('应该成功添加成员到组织', async () => {
      const response = await callApi(updateMembersHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId,
          tmbIds: [tmbId]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(1);
    });

    it('应该成功批量添加成员', async () => {
      // 创建更多成员
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      const response = await callApi(updateMembersHandler, {
        method: 'PUT',
        auth,
        body: {
          orgId,
          tmbIds: [tmbId, member2._id.toString()]
        }
      });

      const data = expectSuccess<{ addedCount: number }>(response);
      expect(data.addedCount).toBe(2);
    });

    it('缺少 orgId 应该返回错误', async () => {
      const response = await callApi(updateMembersHandler, {
        method: 'PUT',
        auth,
        body: {
          tmbIds: [tmbId]
        }
      });

      expectError(response);
    });
  });

  describe('DELETE /api/support/user/team/org/deleteMember', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await testDataFactory.createOrg({ teamId, name: '测试组织' });
      orgId = org._id.toString();

      // 添加成员
      await testDataFactory.createOrgMember({
        teamId,
        orgId,
        tmbId
      });
    });

    it('应该成功从组织删除成员', async () => {
      const response = await callApi(deleteMemberHandler, {
        method: 'DELETE',
        auth,
        body: {
          orgId,
          tmbId
        }
      });

      const data = expectSuccess<{ success: boolean }>(response);
      expect(data.success).toBe(true);

      // 验证成员已删除
      const { OrgMember } = getTestModels();
      const count = await OrgMember.countDocuments({ orgId, tmbId });
      expect(count).toBe(0);
    });

    it('缺少 orgId 应该返回错误', async () => {
      const response = await callApi(deleteMemberHandler, {
        method: 'DELETE',
        auth,
        body: {
          tmbId
        }
      });

      expectError(response);
    });

    it('缺少 tmbId 应该返回错误', async () => {
      const response = await callApi(deleteMemberHandler, {
        method: 'DELETE',
        auth,
        body: {
          orgId
        }
      });

      expectError(response);
    });
  });

  describe('数据隔离测试', () => {
    it('不同团队的组织应该完全隔离', async () => {
      // 当前团队创建组织
      await testDataFactory.createOrg({ teamId, name: '当前团队组织' });

      // 创建另一个团队及其组织
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      await testDataFactory.createOrg({
        teamId: team2._id.toString(),
        name: '另一个团队组织'
      });

      const response = await callApi(listHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ name: string }[]>(response);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('当前团队组织');
    });
  });
});
