/**
 * Phase 5B - 团队与成员管理 API 测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearAllTestCollections,
  testDataFactory
} from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';

// API handlers
import createTeamHandler from '../../../pages/api/support/user/team/create';
import getTeamPlansHandler from '../../../pages/api/support/user/team/plan/getTeamPlans';
import memberListHandler from '../../../pages/api/support/user/team/member/list';
import updateNameHandler from '../../../pages/api/support/user/team/member/updateName';
import updateNameByManagerHandler from '../../../pages/api/support/user/team/member/updateNameByManager';
import restoreHandler from '../../../pages/api/support/user/team/member/restore';
import leaveHandler from '../../../pages/api/support/user/team/member/leave';

// 邀请链接 API
import createInvitationLinkHandler from '../../../pages/api/support/user/team/invitationLink/create';
import listInvitationLinksHandler from '../../../pages/api/support/user/team/invitationLink/list';
import acceptInvitationHandler from '../../../pages/api/support/user/team/invitationLink/accept';
import getInvitationInfoHandler from '../../../pages/api/support/user/team/invitationLink/info';
import forbidInvitationLinkHandler from '../../../pages/api/support/user/team/invitationLink/forbid';

describe('Phase 5B - 团队与成员管理 API', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();
  });

  describe('5B-1: 团队基础', () => {
    describe('POST /api/support/user/team/create', () => {
      it('应成功创建团队', async () => {
        const user = await testDataFactory.createUser({ username: '测试用户' });

        const response = await callApi(createTeamHandler, {
          method: 'POST',
          auth: {
            teamId: 'temp',
            tmbId: 'temp',
            userId: user._id.toString()
          },
          body: {
            name: '测试团队',
            avatar: 'https://example.com/avatar.png'
          }
        });

        const data = expectSuccess(response);
        expect(data.teamId).toBeDefined();
        expect(data.name).toBe('测试团队');
      });

      it('团队名称为空应返回错误', async () => {
        const user = await testDataFactory.createUser({ username: '测试用户' });

        const response = await callApi(createTeamHandler, {
          method: 'POST',
          auth: {
            teamId: 'temp',
            tmbId: 'temp',
            userId: user._id.toString()
          },
          body: { name: '' }
        });

        expectError(response);
        expect(response.body.message).toContain('不能为空');
      });

      it('团队名称过长应返回错误', async () => {
        const user = await testDataFactory.createUser({ username: '测试用户' });

        const response = await callApi(createTeamHandler, {
          method: 'POST',
          auth: {
            teamId: 'temp',
            tmbId: 'temp',
            userId: user._id.toString()
          },
          body: { name: 'a'.repeat(101) }
        });

        expectError(response);
        expect(response.body.message).toContain('100');
      });
    });

    describe('GET /api/support/user/team/plan/getTeamPlans', () => {
      it('应返回团队套餐信息', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '测试成员',
          role: 'owner'
        });

        const response = await callApi(getTeamPlansHandler, {
          method: 'GET',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          }
        });

        const data = expectSuccess(response);
        expect(data.planLevel).toBeDefined();
        expect(data.limits).toBeDefined();
        expect(data.usage).toBeDefined();
      });
    });
  });

  describe('5B-2: 团队成员', () => {
    describe('POST /api/support/user/team/member/list', () => {
      it('应返回成员列表', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '测试成员',
          role: 'owner'
        });

        const response = await callApi(memberListHandler, {
          method: 'POST',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: {}
        });

        const data = expectSuccess(response);
        expect(data.total).toBeGreaterThanOrEqual(1);
        expect(data.list).toBeDefined();
      });

      it('应支持分页', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '测试成员',
          role: 'owner'
        });

        const response = await callApi(memberListHandler, {
          method: 'POST',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: { offset: 0, limit: 10 }
        });

        const data = expectSuccess(response);
        expect(data.list.length).toBeLessThanOrEqual(10);
      });
    });

    describe('PUT /api/support/user/team/member/updateName', () => {
      it('应成功更新自己的名称', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '旧名称',
          role: 'member'
        });

        const response = await callApi(updateNameHandler, {
          method: 'PUT',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: { memberName: '新名称' }
        });

        const data = expectSuccess(response);
        expect(data.success).toBe(true);
      });

      it('名称过长应返回错误', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '测试',
          role: 'member'
        });

        const response = await callApi(updateNameHandler, {
          method: 'PUT',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: { memberName: 'a'.repeat(51) }
        });

        expectError(response);
        expect(response.body.message).toContain('50');
      });
    });

    describe('PUT /api/support/user/team/member/updateNameByManager', () => {
      it('管理员应成功更新成员名称', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const adminUser = await testDataFactory.createUser({ username: '管理员' });
        const targetUser = await testDataFactory.createUser({ username: '目标用户' });

        const admin = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: adminUser._id.toString(),
          name: '管理员',
          role: 'admin'
        });

        const target = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: targetUser._id.toString(),
          name: '旧名称',
          role: 'member'
        });

        const response = await callApi(updateNameByManagerHandler, {
          method: 'PUT',
          auth: {
            teamId: team._id.toString(),
            tmbId: admin._id.toString(),
            userId: adminUser._id.toString()
          },
          body: {
            tmbId: target._id.toString(),
            memberName: '新名称'
          }
        });

        const data = expectSuccess(response);
        expect(data.success).toBe(true);
      });

      it('普通成员应无权限', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const memberUser = await testDataFactory.createUser({ username: '普通成员' });
        const targetUser = await testDataFactory.createUser({ username: '目标用户' });

        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: memberUser._id.toString(),
          name: '普通成员',
          role: 'member'
        });

        const target = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: targetUser._id.toString(),
          name: '目标',
          role: 'member'
        });

        const response = await callApi(updateNameByManagerHandler, {
          method: 'PUT',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: memberUser._id.toString()
          },
          body: {
            tmbId: target._id.toString(),
            memberName: '新名称'
          }
        });

        expectError(response);
        expect(response.body.message).toContain('权限');
      });
    });

    describe('DELETE /api/support/user/team/member/leave', () => {
      it('普通成员应成功离开团队', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '测试成员',
          role: 'member'
        });

        const response = await callApi(leaveHandler, {
          method: 'DELETE',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          }
        });

        const data = expectSuccess(response);
        expect(data.success).toBe(true);
      });

      it('owner 不能离开团队', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '测试成员',
          role: 'owner'
        });

        const response = await callApi(leaveHandler, {
          method: 'DELETE',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          }
        });

        expectError(response);
        expect(response.body.message).toContain('owner');
      });
    });
  });

  describe('5B-3: 邀请链接', () => {
    describe('POST /api/support/user/team/invitationLink/create', () => {
      it('管理员应成功创建邀请链接', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '管理员',
          role: 'admin'
        });

        const response = await callApi(createInvitationLinkHandler, {
          method: 'POST',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: { expireDays: 7, maxUsage: 10 }
        });

        const data = expectSuccess(response);
        expect(data.linkId).toBeDefined();
        expect(data.link).toContain(data.linkId);
        expect(data.maxUsage).toBe(10);
      });

      it('普通成员不能创建邀请链接', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '普通成员',
          role: 'member'
        });

        const response = await callApi(createInvitationLinkHandler, {
          method: 'POST',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: {}
        });

        expectError(response);
        expect(response.body.message).toContain('权限');
      });
    });

    describe('GET /api/support/user/team/invitationLink/list', () => {
      it('应返回邀请链接列表', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '管理员',
          role: 'admin'
        });

        const response = await callApi(listInvitationLinksHandler, {
          method: 'GET',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          }
        });

        const data = expectSuccess(response);
        expect(data.list).toBeDefined();
        expect(Array.isArray(data.list)).toBe(true);
      });
    });

    describe('GET /api/support/user/team/invitationLink/info', () => {
      it('无效链接应返回 isValid: false', async () => {
        const response = await callApi(getInvitationInfoHandler, {
          method: 'GET',
          query: { linkId: 'invalid-link-id' }
        });

        const data = expectSuccess(response);
        expect(data.isValid).toBe(false);
        expect(data.invalidReason).toContain('不存在');
      });
    });

    describe('PUT /api/support/user/team/invitationLink/forbid', () => {
      it('管理员应能禁用邀请链接', async () => {
        const team = await testDataFactory.createTeam({ name: '测试团队' });
        const user = await testDataFactory.createUser({ username: '测试用户' });
        const member = await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '管理员',
          role: 'admin'
        });

        // 先创建邀请链接
        const createResponse = await callApi(createInvitationLinkHandler, {
          method: 'POST',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: { expireDays: 7 }
        });

        const { linkId } = expectSuccess(createResponse);

        // 禁用链接
        const forbidResponse = await callApi(forbidInvitationLinkHandler, {
          method: 'PUT',
          auth: {
            teamId: team._id.toString(),
            tmbId: member._id.toString(),
            userId: user._id.toString()
          },
          body: { linkId, forbid: true }
        });

        const data = expectSuccess(forbidResponse);
        expect(data.success).toBe(true);
      });
    });
  });
});
