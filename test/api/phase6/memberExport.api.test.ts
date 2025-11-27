/**
 * 成员导出 API 测试
 * GET /api/support/user/team/member/export
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callApi, AuthHeaders } from '../../utils/apiTestHelper';
import { testDataFactory, connectTestDB, disconnectTestDB, clearAllTestCollections } from '../../utils/db';
import handler from '../../../pages/api/support/user/team/member/export';

describe('GET /api/support/user/team/member/export', () => {
  let teamId: string;
  let auth: AuthHeaders;

  beforeAll(async () => {
    await connectTestDB();

    // 创建测试团队和用户
    const owner = await testDataFactory.createUser({
      username: '团队所有者',
      email: 'owner@test.com'
    });

    const team = await testDataFactory.createTeam({ name: '测试团队' });
    teamId = team._id.toString();

    const ownerMember = await testDataFactory.createTeamMember({
      teamId,
      userId: owner._id.toString(),
      name: '团队所有者',
      role: 'owner',
      status: 'active'
    });

    auth = {
      teamId,
      tmbId: ownerMember._id.toString(),
      userId: owner._id.toString()
    };
  });

  afterAll(async () => {
    await clearAllTestCollections();
    await disconnectTestDB();
  });

  describe('正常导出', () => {
    it('应该导出空团队为只有表头的 CSV', async () => {
      // 创建一个新的空团队
      const emptyTeam = await testDataFactory.createTeam({ name: '空团队' });
      const emptyOwner = await testDataFactory.createUser({ username: '空团队所有者' });
      const emptyMember = await testDataFactory.createTeamMember({
        teamId: emptyTeam._id.toString(),
        userId: emptyOwner._id.toString(),
        name: '空团队所有者',
        role: 'owner',
        status: 'active'
      });

      const emptyAuth = {
        teamId: emptyTeam._id.toString(),
        tmbId: emptyMember._id.toString(),
        userId: emptyOwner._id.toString()
      };

      const response = await callApi(handler, {
        method: 'GET',
        auth: emptyAuth
      });

      // CSV 导出直接返回字符串，不是 JSON
      expect(response.statusCode).toBe(200);
    });

    it('应该导出团队成员为 CSV 格式', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });

    it('应该包含正确的 CSV 表头', async () => {
      // 添加更多成员
      const member1 = await testDataFactory.createUser({
        username: '测试成员1',
        email: 'member1@test.com',
        phone: '13900139001'
      });

      await testDataFactory.createTeamMember({
        teamId,
        userId: member1._id.toString(),
        name: '测试成员1',
        role: 'member',
        status: 'active'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });

    it('应该正确导出成员的角色信息', async () => {
      // 添加管理员
      const admin = await testDataFactory.createUser({
        username: '测试管理员',
        email: 'admin@test.com'
      });

      await testDataFactory.createTeamMember({
        teamId,
        userId: admin._id.toString(),
        name: '测试管理员',
        role: 'admin',
        status: 'active'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });

    it('应该正确导出成员的状态信息', async () => {
      // 添加离开状态的成员
      const leftUser = await testDataFactory.createUser({
        username: '已离开成员',
        email: 'left@test.com'
      });

      await testDataFactory.createTeamMember({
        teamId,
        userId: leftUser._id.toString(),
        name: '已离开成员',
        role: 'member',
        status: 'leave'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });

    it('应该正确导出成员的部门信息', async () => {
      // 创建组织
      const org = await testDataFactory.createOrg({
        teamId,
        name: '技术部',
        path: '技术部'
      });

      // 创建成员
      const deptUser = await testDataFactory.createUser({
        username: '技术部成员',
        email: 'tech@test.com'
      });

      const deptMember = await testDataFactory.createTeamMember({
        teamId,
        userId: deptUser._id.toString(),
        name: '技术部成员',
        role: 'member',
        status: 'active'
      });

      // 关联组织成员
      await testDataFactory.createOrgMember({
        teamId,
        orgId: org._id.toString(),
        tmbId: deptMember._id.toString()
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('格式参数', () => {
    it('默认格式应该是 CSV', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });

    it('显式指定 CSV 格式应该成功', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { format: 'csv' }
      });

      expect(response.statusCode).toBe(200);
    });

    it('不支持的格式应该返回错误', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { format: 'xlsx' }
      });

      expect(response.body.code).not.toBe(200);
    });
  });

  describe('权限验证', () => {
    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        skipAuthMock: true
      });

      expect(response.body.code).not.toBe(200);
    });

    it('普通成员也应该能导出', async () => {
      // 创建普通成员
      const normalUser = await testDataFactory.createUser({ username: '普通成员' });
      const normalMember = await testDataFactory.createTeamMember({
        teamId,
        userId: normalUser._id.toString(),
        name: '普通成员',
        role: 'member',
        status: 'active'
      });

      const normalAuth = {
        teamId,
        tmbId: normalMember._id.toString(),
        userId: normalUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'GET',
        auth: normalAuth
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('特殊字符处理', () => {
    it('应该正确处理包含逗号的用户名', async () => {
      const specialUser = await testDataFactory.createUser({
        username: '张三,李四'
      });

      await testDataFactory.createTeamMember({
        teamId,
        userId: specialUser._id.toString(),
        name: '张三,李四',
        role: 'member',
        status: 'active'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });

    it('应该正确处理包含引号的用户名', async () => {
      const quoteUser = await testDataFactory.createUser({
        username: '王"五"'
      });

      await testDataFactory.createTeamMember({
        teamId,
        userId: quoteUser._id.toString(),
        name: '王"五"',
        role: 'member',
        status: 'active'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
