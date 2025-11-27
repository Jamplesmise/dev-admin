/**
 * Phase 6B - 分组成员 API 测试
 * 测试分组成员列表和更改分组所有者 API
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

// 导入 API handlers
import membersHandler from '@/api/support/user/team/group/members';
import changeOwnerHandler from '@/api/support/user/team/group/changeOwner';

describe('Phase 6B - 分组成员 API 测试', () => {
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

  describe('GET /api/support/user/team/group/members', () => {
    describe('正常流程', () => {
      it('应该返回分组成员列表', async () => {
        // 创建分组和成员
        const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });
        await testDataFactory.createGroupMember({
          teamId,
          groupId: group._id.toString(),
          tmbId,
          role: 'owner'
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: group._id.toString() }
        });

        const data = expectSuccess<Array<{ tmbId: string; memberName: string; role: string }>>(
          response
        );
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(1);
        expect(data[0].tmbId).toBe(tmbId);
        expect(data[0].role).toBe('owner');
      });

      it('应该包含成员的名称和头像', async () => {
        const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });
        await testDataFactory.createGroupMember({
          teamId,
          groupId: group._id.toString(),
          tmbId,
          role: 'member'
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: group._id.toString() }
        });

        const data = expectSuccess<Array<{ memberName: string; avatar: string }>>(response);
        expect(data[0]).toHaveProperty('memberName');
        expect(data[0]).toHaveProperty('avatar');
      });

      it('应该按角色排序（owner > member）', async () => {
        const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });

        // 创建多个成员
        const user2 = await testDataFactory.createUser({ username: '用户2' });
        const member2 = await testDataFactory.createTeamMember({
          teamId,
          userId: user2._id.toString(),
          name: '成员2'
        });

        // owner 先创建
        await testDataFactory.createGroupMember({
          teamId,
          groupId: group._id.toString(),
          tmbId,
          role: 'owner'
        });

        // member 后创建
        await testDataFactory.createGroupMember({
          teamId,
          groupId: group._id.toString(),
          tmbId: member2._id.toString(),
          role: 'member'
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: group._id.toString() }
        });

        const data = expectSuccess<Array<{ role: string }>>(response);
        expect(data).toHaveLength(2);
        expect(data[0].role).toBe('owner');
        expect(data[1].role).toBe('member');
      });
    });

    describe('参数验证', () => {
      it('groupId 必填', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth
        });

        expectError(response);
      });

      it('groupId 格式必须有效', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: 'invalid' }
        });

        expectError(response);
      });
    });

    describe('权限验证', () => {
      it('未认证请求应返回错误', async () => {
        const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });

        const response = await callApi(membersHandler, {
          method: 'GET',
          query: { groupId: group._id.toString() },
          skipAuthMock: true
        });

        expectError(response);
      });

      it('只能查询当前团队的分组', async () => {
        // 创建另一个团队的分组
        const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
        const group2 = await testDataFactory.createMemberGroup({
          teamId: team2._id.toString(),
          name: '其他团队分组'
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: group2._id.toString() }
        });

        expectError(response);
      });
    });

    describe('边界条件', () => {
      it('分组不存在时返回错误', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: '507f1f77bcf86cd799439011' }
        });

        expectError(response);
      });

      it('分组没有成员时返回空数组', async () => {
        const group = await testDataFactory.createMemberGroup({ teamId, name: '空分组' });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId: group._id.toString() }
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(0);
      });
    });
  });

  describe('PUT /api/support/user/team/group/changeOwner', () => {
    let groupId: string;
    let newOwnerTmbId: string;

    beforeEach(async () => {
      // 创建分组
      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });
      groupId = group._id.toString();

      // 当前用户作为 owner
      await testDataFactory.createGroupMember({
        teamId,
        groupId,
        tmbId,
        role: 'owner'
      });

      // 创建另一个成员
      const user2 = await testDataFactory.createUser({ username: '新所有者' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '新所有者'
      });
      newOwnerTmbId = member2._id.toString();

      await testDataFactory.createGroupMember({
        teamId,
        groupId,
        tmbId: newOwnerTmbId,
        role: 'member'
      });
    });

    describe('正常流程', () => {
      it('应该成功转让分组所有权', async () => {
        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth,
          body: {
            groupId,
            tmbId: newOwnerTmbId
          }
        });

        expectSuccess(response);

        // 验证新所有者
        const membersResponse = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: { groupId }
        });

        const members = expectSuccess<Array<{ tmbId: string; role: string }>>(membersResponse);
        const newOwner = members.find((m) => m.tmbId === newOwnerTmbId);
        const oldOwner = members.find((m) => m.tmbId === tmbId);

        expect(newOwner?.role).toBe('owner');
        expect(oldOwner?.role).toBe('member');
      });
    });

    describe('权限验证', () => {
      it('只有分组 owner 可以转让', async () => {
        // 创建另一个非 owner 用户
        const user3 = await testDataFactory.createUser({ username: '普通成员' });
        const member3 = await testDataFactory.createTeamMember({
          teamId,
          userId: user3._id.toString(),
          name: '普通成员'
        });

        await testDataFactory.createGroupMember({
          teamId,
          groupId,
          tmbId: member3._id.toString(),
          role: 'member'
        });

        // 使用普通成员的认证
        const memberAuth: AuthHeaders = {
          teamId,
          tmbId: member3._id.toString(),
          userId: user3._id.toString()
        };

        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth: memberAuth,
          body: {
            groupId,
            tmbId: newOwnerTmbId
          }
        });

        expectError(response);
      });

      it('未认证请求应返回错误', async () => {
        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          body: {
            groupId,
            tmbId: newOwnerTmbId
          },
          skipAuthMock: true
        });

        expectError(response);
      });
    });

    describe('数据验证', () => {
      it('新所有者必须是分组成员', async () => {
        // 创建一个不在分组内的成员
        const user4 = await testDataFactory.createUser({ username: '非分组成员' });
        const member4 = await testDataFactory.createTeamMember({
          teamId,
          userId: user4._id.toString(),
          name: '非分组成员'
        });

        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth,
          body: {
            groupId,
            tmbId: member4._id.toString()
          }
        });

        expectError(response);
      });

      it('不能转让给自己', async () => {
        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth,
          body: {
            groupId,
            tmbId // 自己的 tmbId
          }
        });

        expectError(response);
      });

      it('groupId 必填', async () => {
        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth,
          body: {
            tmbId: newOwnerTmbId
          }
        });

        expectError(response);
      });

      it('tmbId 必填', async () => {
        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth,
          body: {
            groupId
          }
        });

        expectError(response);
      });

      it('分组不存在应返回错误', async () => {
        const response = await callApi(changeOwnerHandler, {
          method: 'PUT',
          auth,
          body: {
            groupId: '507f1f77bcf86cd799439011',
            tmbId: newOwnerTmbId
          }
        });

        expectError(response);
      });
    });
  });
});
