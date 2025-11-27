/**
 * 成员分组模块集成测试
 * 使用真实 MongoDB 进行测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearCollection,
  testDataFactory,
  getTestModels
} from '../utils/db';

describe('成员分组模块集成测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // 清理测试数据
    await clearCollection('member_groups');
    await clearCollection('group_members');
    await clearCollection('teams');
    await clearCollection('team.members');
    await clearCollection('users');

    // 创建基础测试数据
    const user = await testDataFactory.createUser({ username: '分组测试用户' });
    const team = await testDataFactory.createTeam({ name: '分组测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '分组测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
    userId = user._id.toString();
  });

  describe('分组创建测试', () => {
    it('应该成功创建分组', async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '前端开发组'
      });

      expect(group._id).toBeDefined();
      expect(group.name).toBe('前端开发组');
      expect(group.teamId.toString()).toBe(teamId);
    });

    it('应该支持创建带头像的分组', async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '后端开发组',
        avatar: 'https://example.com/avatar.png'
      });

      expect(group.avatar).toBe('https://example.com/avatar.png');
    });

    it('应该允许同一团队创建多个分组', async () => {
      await testDataFactory.createMemberGroup({ teamId, name: '分组1' });
      await testDataFactory.createMemberGroup({ teamId, name: '分组2' });
      await testDataFactory.createMemberGroup({ teamId, name: '分组3' });

      const { MemberGroup } = getTestModels();
      const count = await MemberGroup.countDocuments({ teamId });
      expect(count).toBe(3);
    });

    it('不同团队可以创建同名分组', async () => {
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });

      await testDataFactory.createMemberGroup({ teamId, name: '开发组' });
      await testDataFactory.createMemberGroup({
        teamId: team2._id.toString(),
        name: '开发组'
      });

      const { MemberGroup } = getTestModels();
      const groups = await MemberGroup.find({ name: '开发组' }).lean();
      expect(groups.length).toBe(2);
    });
  });

  describe('分组查询测试', () => {
    beforeEach(async () => {
      // 创建测试分组
      await testDataFactory.createMemberGroup({ teamId, name: '前端组' });
      await testDataFactory.createMemberGroup({ teamId, name: '后端组' });
      await testDataFactory.createMemberGroup({ teamId, name: '测试组' });
    });

    it('应该返回团队所有分组', async () => {
      const { MemberGroup } = getTestModels();
      const groups = await MemberGroup.find({ teamId }).lean();

      expect(groups.length).toBe(3);
    });

    it('应该按名称模糊查询分组', async () => {
      const { MemberGroup } = getTestModels();
      const groups = await MemberGroup.find({
        teamId,
        name: /组$/
      }).lean();

      expect(groups.length).toBe(3);
    });

    it('应该支持精确查询分组名称', async () => {
      const { MemberGroup } = getTestModels();
      const group = await MemberGroup.findOne({
        teamId,
        name: '前端组'
      }).lean();

      expect(group).not.toBeNull();
      expect(group!.name).toBe('前端组');
    });

    it('查询不存在的分组应返回 null', async () => {
      const { MemberGroup } = getTestModels();
      const group = await MemberGroup.findOne({
        teamId,
        name: '不存在的分组'
      }).lean();

      expect(group).toBeNull();
    });
  });

  describe('分组成员管理测试', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '测试分组'
      });
      groupId = group._id.toString();
    });

    it('应该成功添加成员到分组', async () => {
      const groupMember = await testDataFactory.createGroupMember({
        teamId,
        groupId,
        tmbId
      });

      expect(groupMember._id).toBeDefined();
      expect(groupMember.groupId.toString()).toBe(groupId);
      expect(groupMember.tmbId.toString()).toBe(tmbId);
      expect(groupMember.role).toBe('member');
    });

    it('应该支持添加管理员角色', async () => {
      const groupMember = await testDataFactory.createGroupMember({
        teamId,
        groupId,
        tmbId,
        role: 'owner'
      });

      expect(groupMember.role).toBe('owner');
    });

    it('应该支持一个分组有多个成员', async () => {
      // 创建额外的团队成员
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      const user3 = await testDataFactory.createUser({ username: '成员3' });
      const member3 = await testDataFactory.createTeamMember({
        teamId,
        userId: user3._id.toString(),
        name: '成员3'
      });

      // 添加成员到分组
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId });
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId: member2._id.toString() });
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId: member3._id.toString() });

      const { GroupMember } = getTestModels();
      const members = await GroupMember.find({ groupId }).lean();

      expect(members.length).toBe(3);
    });

    it('应该支持成员加入多个分组', async () => {
      const group2 = await testDataFactory.createMemberGroup({ teamId, name: '分组2' });
      const group3 = await testDataFactory.createMemberGroup({ teamId, name: '分组3' });

      await testDataFactory.createGroupMember({ teamId, groupId, tmbId });
      await testDataFactory.createGroupMember({ teamId, groupId: group2._id.toString(), tmbId });
      await testDataFactory.createGroupMember({ teamId, groupId: group3._id.toString(), tmbId });

      const { GroupMember } = getTestModels();
      const memberships = await GroupMember.find({ tmbId }).lean();

      expect(memberships.length).toBe(3);
    });

    it('同一成员不能重复加入同一分组 (唯一约束)', async () => {
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId });

      // 尝试重复添加应该抛出错误
      await expect(
        testDataFactory.createGroupMember({ teamId, groupId, tmbId })
      ).rejects.toThrow();
    });
  });

  describe('分组更新测试', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '原始名称'
      });
      groupId = group._id.toString();
    });

    it('应该成功更新分组名称', async () => {
      const { MemberGroup } = getTestModels();

      await MemberGroup.updateOne(
        { _id: groupId },
        { $set: { name: '新名称', updateTime: new Date() } }
      );

      const updated = await MemberGroup.findById(groupId).lean();
      expect(updated?.name).toBe('新名称');
    });

    it('应该成功更新分组头像', async () => {
      const { MemberGroup } = getTestModels();

      await MemberGroup.updateOne(
        { _id: groupId },
        { $set: { avatar: 'https://new-avatar.png' } }
      );

      const updated = await MemberGroup.findById(groupId).lean();
      expect(updated?.avatar).toBe('https://new-avatar.png');
    });
  });

  describe('分组删除测试', () => {
    it('应该成功删除空分组', async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '待删除分组'
      });

      const { MemberGroup } = getTestModels();
      await MemberGroup.deleteOne({ _id: group._id });

      const deleted = await MemberGroup.findById(group._id).lean();
      expect(deleted).toBeNull();
    });

    it('删除分组应该同时删除成员关系', async () => {
      const group = await testDataFactory.createMemberGroup({
        teamId,
        name: '待删除分组'
      });
      const groupId = group._id.toString();

      // 添加成员
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId });

      const { MemberGroup, GroupMember } = getTestModels();

      // 验证成员关系存在
      let memberCount = await GroupMember.countDocuments({ groupId: group._id });
      expect(memberCount).toBe(1);

      // 删除分组和成员关系（模拟事务）
      await MemberGroup.deleteOne({ _id: group._id });
      await GroupMember.deleteMany({ groupId: group._id });

      // 验证都被删除
      const deletedGroup = await MemberGroup.findById(group._id).lean();
      memberCount = await GroupMember.countDocuments({ groupId: group._id });

      expect(deletedGroup).toBeNull();
      expect(memberCount).toBe(0);
    });
  });

  describe('分组成员数量统计测试', () => {
    it('应该正确统计分组成员数量', async () => {
      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试分组' });
      const groupId = group._id.toString();

      // 创建多个成员
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      // 添加成员
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId });
      await testDataFactory.createGroupMember({ teamId, groupId, tmbId: member2._id.toString() });

      const { GroupMember } = getTestModels();
      const memberCount = await GroupMember.countDocuments({ groupId: group._id });

      expect(memberCount).toBe(2);
    });

    it('应该使用聚合查询批量获取成员数量', async () => {
      // 创建多个分组
      const group1 = await testDataFactory.createMemberGroup({ teamId, name: '分组1' });
      const group2 = await testDataFactory.createMemberGroup({ teamId, name: '分组2' });
      const group3 = await testDataFactory.createMemberGroup({ teamId, name: '分组3' });

      // 创建额外成员
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      // 分配成员到不同分组
      await testDataFactory.createGroupMember({ teamId, groupId: group1._id.toString(), tmbId });
      await testDataFactory.createGroupMember({ teamId, groupId: group1._id.toString(), tmbId: member2._id.toString() });
      await testDataFactory.createGroupMember({ teamId, groupId: group2._id.toString(), tmbId });
      // group3 没有成员

      const { GroupMember } = getTestModels();

      // 使用聚合查询统计
      const memberCounts = await GroupMember.aggregate([
        { $match: { groupId: { $in: [group1._id, group2._id, group3._id] } } },
        { $group: { _id: '$groupId', count: { $sum: 1 } } }
      ]);

      const countMap = new Map<string, number>();
      memberCounts.forEach((item) => {
        countMap.set(String(item._id), item.count);
      });

      expect(countMap.get(group1._id.toString())).toBe(2);
      expect(countMap.get(group2._id.toString())).toBe(1);
      expect(countMap.get(group3._id.toString())).toBeUndefined(); // 无成员
    });
  });

  describe('团队数据隔离测试', () => {
    it('不同团队的分组应该完全隔离', async () => {
      const team2 = await testDataFactory.createTeam({ name: '团队2' });

      await testDataFactory.createMemberGroup({ teamId, name: '团队1分组' });
      await testDataFactory.createMemberGroup({
        teamId: team2._id.toString(),
        name: '团队2分组'
      });

      const { MemberGroup } = getTestModels();

      const team1Groups = await MemberGroup.find({ teamId }).lean();
      const team2Groups = await MemberGroup.find({ teamId: team2._id }).lean();

      expect(team1Groups.length).toBe(1);
      expect(team2Groups.length).toBe(1);
      expect(team1Groups[0].name).toBe('团队1分组');
      expect(team2Groups[0].name).toBe('团队2分组');
    });
  });

  describe('性能测试', () => {
    it('应该能高效处理大量分组', async () => {
      // 创建 50 个分组
      const createPromises: Promise<unknown>[] = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          testDataFactory.createMemberGroup({
            teamId,
            name: `分组-${i}`
          })
        );
      }
      await Promise.all(createPromises);

      const { MemberGroup } = getTestModels();

      const startTime = Date.now();
      const groups = await MemberGroup.find({ teamId })
        .sort({ createTime: -1 })
        .limit(10)
        .lean();
      const duration = Date.now() - startTime;

      expect(groups.length).toBe(10);
      expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
    });
  });
});
