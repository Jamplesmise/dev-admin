/**
 * 协作者管理模块集成测试
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

// 权限位定义
const PermissionBits = {
  read: 0b100,   // 4
  write: 0b010,  // 2
  manage: 0b001  // 1
};

const PermissionPresets = {
  readOnly: PermissionBits.read,                                    // 4
  readWrite: PermissionBits.read | PermissionBits.write,           // 6
  full: PermissionBits.read | PermissionBits.write | PermissionBits.manage // 7
};

describe('协作者管理模块集成测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
  let appId: string;
  let datasetId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // 清理测试数据
    await clearCollection('collaborators');
    await clearCollection('apps');
    await clearCollection('datasets');
    await clearCollection('member_groups');
    await clearCollection('group_members');
    await clearCollection('organizations');
    await clearCollection('teams');
    await clearCollection('team.members');
    await clearCollection('users');

    // 创建基础测试数据
    const user = await testDataFactory.createUser({ username: '协作者测试用户' });
    const team = await testDataFactory.createTeam({ name: '协作者测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '协作者测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
    userId = user._id.toString();

    // 创建测试应用和数据集
    const app = await testDataFactory.createApp({
      teamId,
      tmbId,
      name: '测试应用'
    });
    appId = app._id.toString();

    const dataset = await testDataFactory.createDataset({
      teamId,
      tmbId,
      name: '测试数据集'
    });
    datasetId = dataset._id.toString();
  });

  describe('应用协作者测试', () => {
    it('应该成功添加成员为应用协作者', async () => {
      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      expect(collaborator._id).toBeDefined();
      expect(collaborator.resourceType).toBe('app');
      expect(collaborator.tmbId?.toString()).toBe(tmbId);
      expect(collaborator.permission).toBe(PermissionPresets.readOnly);
    });

    it('应该成功添加分组为应用协作者', async () => {
      const group = await testDataFactory.createMemberGroup({ teamId, name: '开发组' });

      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        groupId: group._id.toString(),
        permission: PermissionPresets.readWrite
      });

      expect(collaborator.groupId?.toString()).toBe(group._id.toString());
      expect(collaborator.permission).toBe(PermissionPresets.readWrite);
    });

    it('应该成功添加组织为应用协作者', async () => {
      const org = await testDataFactory.createOrg({ teamId, name: '技术部' });

      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        orgId: org._id.toString(),
        permission: PermissionPresets.full
      });

      expect(collaborator.orgId?.toString()).toBe(org._id.toString());
      expect(collaborator.permission).toBe(PermissionPresets.full);
    });

    it('应该支持同一应用有多个协作者', async () => {
      // 创建额外成员
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试组' });

      // 添加多个协作者
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: PermissionPresets.readWrite
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        groupId: group._id.toString(),
        permission: PermissionPresets.full
      });

      const { Collaborator } = getTestModels();
      const collaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: appId
      }).lean();

      expect(collaborators.length).toBe(3);
    });
  });

  describe('数据集协作者测试', () => {
    it('应该成功添加成员为数据集协作者', async () => {
      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      expect(collaborator.resourceType).toBe('dataset');
      expect(collaborator.resourceId.toString()).toBe(datasetId);
    });

    it('应该成功添加分组为数据集协作者', async () => {
      const group = await testDataFactory.createMemberGroup({ teamId, name: '数据组' });

      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        groupId: group._id.toString(),
        permission: PermissionPresets.readWrite
      });

      expect(collaborator.groupId?.toString()).toBe(group._id.toString());
    });
  });

  describe('协作者查询测试', () => {
    beforeEach(async () => {
      // 创建多个协作者
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试组' });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: PermissionPresets.readWrite
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        groupId: group._id.toString(),
        permission: PermissionPresets.full
      });
    });

    it('应该返回资源的所有协作者', async () => {
      const { Collaborator } = getTestModels();
      const collaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: appId
      }).lean();

      expect(collaborators.length).toBe(3);
    });

    it('应该按协作者类型筛选', async () => {
      const { Collaborator } = getTestModels();

      // 只查成员协作者
      const memberCollaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: appId,
        tmbId: { $exists: true, $ne: null }
      }).lean();

      expect(memberCollaborators.length).toBe(2);

      // 只查分组协作者
      const groupCollaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: appId,
        groupId: { $exists: true, $ne: null }
      }).lean();

      expect(groupCollaborators.length).toBe(1);
    });
  });

  describe('协作者权限更新测试', () => {
    it('应该成功更新协作者权限', async () => {
      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      const { Collaborator } = getTestModels();

      await Collaborator.updateOne(
        { _id: collaborator._id },
        { $set: { permission: PermissionPresets.full } }
      );

      const updated = await Collaborator.findById(collaborator._id).lean();
      expect(updated?.permission).toBe(PermissionPresets.full);
    });
  });

  describe('协作者删除测试', () => {
    it('应该成功删除协作者', async () => {
      const collaborator = await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      const { Collaborator } = getTestModels();
      await Collaborator.deleteOne({ _id: collaborator._id });

      const deleted = await Collaborator.findById(collaborator._id).lean();
      expect(deleted).toBeNull();
    });

    it('应该支持批量删除协作者', async () => {
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: PermissionPresets.readWrite
      });

      const { Collaborator } = getTestModels();

      // 批量删除
      const result = await Collaborator.deleteMany({
        resourceType: 'app',
        resourceId: appId
      });

      expect(result.deletedCount).toBe(2);
    });
  });

  describe('权限位计算测试', () => {
    it('应该正确检查只读权限', () => {
      const permission = PermissionPresets.readOnly;

      expect((permission & PermissionBits.read) !== 0).toBe(true);
      expect((permission & PermissionBits.write) !== 0).toBe(false);
      expect((permission & PermissionBits.manage) !== 0).toBe(false);
    });

    it('应该正确检查读写权限', () => {
      const permission = PermissionPresets.readWrite;

      expect((permission & PermissionBits.read) !== 0).toBe(true);
      expect((permission & PermissionBits.write) !== 0).toBe(true);
      expect((permission & PermissionBits.manage) !== 0).toBe(false);
    });

    it('应该正确检查完全权限', () => {
      const permission = PermissionPresets.full;

      expect((permission & PermissionBits.read) !== 0).toBe(true);
      expect((permission & PermissionBits.write) !== 0).toBe(true);
      expect((permission & PermissionBits.manage) !== 0).toBe(true);
    });

    it('应该正确合并多个权限 (OR 运算)', async () => {
      // 场景：用户同时是成员协作者(只读)和分组协作者(读写)
      const group = await testDataFactory.createMemberGroup({ teamId, name: '测试组' });
      await testDataFactory.createGroupMember({ teamId, groupId: group._id.toString(), tmbId });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly // 4
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        groupId: group._id.toString(),
        permission: PermissionPresets.readWrite // 6
      });

      const { Collaborator } = getTestModels();

      // 查询用户的所有相关协作者
      const collaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: appId,
        $or: [
          { tmbId },
          { groupId: group._id }
        ]
      }).lean();

      // 权限合并（OR 运算）
      const mergedPermission = collaborators.reduce(
        (perm, collab) => perm | collab.permission,
        0
      );

      // 4 | 6 = 6 (0b100 | 0b110 = 0b110)
      expect(mergedPermission).toBe(6);
      expect((mergedPermission & PermissionBits.read) !== 0).toBe(true);
      expect((mergedPermission & PermissionBits.write) !== 0).toBe(true);
    });
  });

  describe('资源隔离测试', () => {
    it('不同资源的协作者应该隔离', async () => {
      const app2 = await testDataFactory.createApp({ teamId, tmbId, name: '应用2' });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: app2._id.toString(),
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.full
      });

      const { Collaborator } = getTestModels();

      const app1Collaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: appId
      }).lean();

      const app2Collaborators = await Collaborator.find({
        resourceType: 'app',
        resourceId: app2._id
      }).lean();

      expect(app1Collaborators.length).toBe(1);
      expect(app2Collaborators.length).toBe(1);
      expect(app1Collaborators[0].permission).toBe(PermissionPresets.readOnly);
      expect(app2Collaborators[0].permission).toBe(PermissionPresets.full);
    });

    it('应用和数据集的协作者应该隔离', async () => {
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId,
        permission: PermissionPresets.full
      });

      const { Collaborator } = getTestModels();

      const appCollaborators = await Collaborator.find({
        resourceType: 'app'
      }).lean();

      const datasetCollaborators = await Collaborator.find({
        resourceType: 'dataset'
      }).lean();

      expect(appCollaborators.length).toBe(1);
      expect(datasetCollaborators.length).toBe(1);
    });
  });

  describe('团队数据隔离测试', () => {
    it('不同团队的协作者应该完全隔离', async () => {
      const team2 = await testDataFactory.createTeam({ name: '团队2' });
      const user2 = await testDataFactory.createUser({ username: '用户2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user2._id.toString(),
        name: '成员2'
      });
      const app2 = await testDataFactory.createApp({
        teamId: team2._id.toString(),
        tmbId: member2._id.toString(),
        name: '团队2应用'
      });

      await testDataFactory.createCollaborator({
        teamId,
        resourceId: appId,
        resourceType: 'app',
        tmbId,
        permission: PermissionPresets.readOnly
      });

      await testDataFactory.createCollaborator({
        teamId: team2._id.toString(),
        resourceId: app2._id.toString(),
        resourceType: 'app',
        tmbId: member2._id.toString(),
        permission: PermissionPresets.full
      });

      const { Collaborator } = getTestModels();

      const team1Collaborators = await Collaborator.find({ teamId }).lean();
      const team2Collaborators = await Collaborator.find({ teamId: team2._id }).lean();

      expect(team1Collaborators.length).toBe(1);
      expect(team2Collaborators.length).toBe(1);
    });
  });
});
