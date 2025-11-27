import { Types, type ClientSession } from 'mongoose';
import { MongoCollaboratorModel } from './schema';
import type { CollaboratorListItemType } from '../../../global/support/permission/collaborator/type';
import {
  type ResourceTypeEnum,
  CollaboratorTypeEnum,
  PermissionBits,
  ResourceTypeEnum as ResourceTypeEnumValues
} from '../../../global/support/permission/collaborator/constant';
import { MongoMemberGroupModel } from '../memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '../memberGroup/groupMemberSchema';
import { MongoOrgModel } from '../org/orgSchema';
import { MongoOrgMemberModel } from '../org/orgMemberSchema';
import { TeamPermission } from '../../../global/support/permission/user/controller';
import { TeamMemberRoleEnum } from '../../../global/support_user_team/constant';

// 辅助函数：安全转换 ObjectId
const toObjectId = (id: string) => new Types.ObjectId(id);

// 计算用户对资源的最终权限（权限取并集）
export const calculatePermission = async ({
  resourceType,
  resourceId,
  tmbId,
  teamId
}: {
  resourceType: `${ResourceTypeEnum}`;
  resourceId: string;
  tmbId: string;
  teamId: string;
}): Promise<number> => {
  // 获取用户所在的分组
  const userGroupMembers = await MongoGroupMemberModel.find({ teamId, tmbId }, 'groupId').lean();
  const userGroupIds = userGroupMembers.map((m) => String(m.groupId));

  // 获取用户所在的组织
  const userOrgMembers = await MongoOrgMemberModel.find({ teamId, tmbId }, 'orgId').lean();
  const userOrgIds = userOrgMembers.map((m) => String(m.orgId));

  // 查找所有相关的协作者记录
  const collaborators = await MongoCollaboratorModel.find({
    resourceType,
    resourceId,
    $or: [
      { tmbId },
      { groupId: { $in: userGroupIds } },
      { orgId: { $in: userOrgIds } }
    ]
  }).lean();

  // 权限取并集（OR 运算）
  return collaborators.reduce((perm, collab) => perm | collab.permission, 0);
};

// 检查用户是否有指定权限
export const hasPermission = (userPerm: number, requiredPerm: number): boolean => {
  return (userPerm & requiredPerm) === requiredPerm;
};

// 检查用户是否有读取权限
export const hasReadPermission = (userPerm: number): boolean => {
  return hasPermission(userPerm, PermissionBits.read);
};

// 检查用户是否有写入权限
export const hasWritePermission = (userPerm: number): boolean => {
  return hasPermission(userPerm, PermissionBits.write);
};

// 检查用户是否有管理权限
export const hasManagePermission = (userPerm: number): boolean => {
  return hasPermission(userPerm, PermissionBits.manage);
};

// 模型协作者返回类型
export type ModelCollaboratorDetailType = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  teamId: string;
  permission: { value: number };
  name: string;
  avatar: string;
};

// 获取模型协作者列表（专用于模型，返回前端期望的格式）
export const getModelCollaboratorList = async ({
  model,
  teamId
}: {
  model: string;
  teamId: string;
}): Promise<ModelCollaboratorDetailType[]> => {
  const collaborators = await MongoCollaboratorModel.find({
    teamId: toObjectId(teamId),
    resourceType: ResourceTypeEnumValues.model,
    resourceId: model
  }).lean();

  if (collaborators.length === 0) {
    return [];
  }

  // 收集所有需要查询的 ID
  const tmbIds: string[] = [];
  const groupIds: string[] = [];
  const orgIds: string[] = [];

  collaborators.forEach((collab) => {
    if (collab.tmbId) tmbIds.push(String(collab.tmbId));
    if (collab.groupId) groupIds.push(String(collab.groupId));
    if (collab.orgId) orgIds.push(String(collab.orgId));
  });

  // 批量查询所有相关数据
  const [groups, orgs] = await Promise.all([
    groupIds.length > 0
      ? MongoMemberGroupModel.find({ _id: { $in: groupIds } }, 'name avatar').lean()
      : [],
    orgIds.length > 0 ? MongoOrgModel.find({ _id: { $in: orgIds } }, 'name avatar').lean() : []
  ]);

  // 构建查找 Map
  const groupMap = new Map(groups.map((g) => [String(g._id), g]));
  const orgMap = new Map(orgs.map((o) => [String(o._id), o]));

  const result: ModelCollaboratorDetailType[] = [];

  for (const collab of collaborators) {
    let name = '';
    let avatar = '';

    if (collab.tmbId) {
      name = `成员_${String(collab.tmbId).slice(-4)}`;
      result.push({
        tmbId: String(collab.tmbId),
        teamId,
        permission: { value: collab.permission },
        name,
        avatar
      });
    } else if (collab.groupId) {
      const group = groupMap.get(String(collab.groupId));
      name = group?.name || '未知分组';
      avatar = group?.avatar || '';
      result.push({
        groupId: String(collab.groupId),
        teamId,
        permission: { value: collab.permission },
        name,
        avatar
      });
    } else if (collab.orgId) {
      const org = orgMap.get(String(collab.orgId));
      name = org?.name || '未知组织';
      avatar = org?.avatar || '';
      result.push({
        orgId: String(collab.orgId),
        teamId,
        permission: { value: collab.permission },
        name,
        avatar
      });
    }
  }

  return result;
};

// 官方协作者详情类型
export type CollaboratorItemDetailType = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  teamId: string;
  permission: { value: number };
  name: string;
  avatar: string;
};

// 获取协作者列表（带名称信息，批量优化查询）
// 返回官方格式: { tmbId/groupId/orgId, teamId, permission: { value }, name, avatar }
export const getCollaboratorList = async ({
  resourceType,
  resourceId,
  teamId
}: {
  resourceType: `${ResourceTypeEnum}`;
  resourceId: string;
  teamId: string;
}): Promise<CollaboratorItemDetailType[]> => {
  // model 类型的 resourceId 是模型名称字符串，不需要转换为 ObjectId
  const isModelResource = resourceType === ResourceTypeEnumValues.model;

  const collaborators = await MongoCollaboratorModel.find({
    teamId: toObjectId(teamId),
    resourceType,
    resourceId: isModelResource ? resourceId : toObjectId(resourceId)
  }).lean();

  if (collaborators.length === 0) {
    return [];
  }

  // 收集所有需要查询的 ID
  const tmbIds: string[] = [];
  const groupIds: string[] = [];
  const orgIds: string[] = [];

  collaborators.forEach((collab) => {
    if (collab.tmbId) tmbIds.push(String(collab.tmbId));
    if (collab.groupId) groupIds.push(String(collab.groupId));
    if (collab.orgId) orgIds.push(String(collab.orgId));
  });

  // 批量查询所有相关数据
  const [groups, orgs] = await Promise.all([
    groupIds.length > 0
      ? MongoMemberGroupModel.find({ _id: { $in: groupIds } }, 'name avatar').lean()
      : [],
    orgIds.length > 0 ? MongoOrgModel.find({ _id: { $in: orgIds } }, 'name avatar').lean() : []
  ]);

  // 构建查找 Map
  const groupMap = new Map(groups.map((g) => [String(g._id), g]));
  const orgMap = new Map(orgs.map((o) => [String(o._id), o]));

  const result: CollaboratorItemDetailType[] = [];

  for (const collab of collaborators) {
    let name = '';
    let avatar = '';

    if (collab.tmbId) {
      const tmbIdStr = String(collab.tmbId);
      name = `成员_${tmbIdStr.slice(-4)}`;
      result.push({
        tmbId: tmbIdStr,
        teamId,
        permission: { value: collab.permission },
        name,
        avatar
      });
    } else if (collab.groupId) {
      const groupIdStr = String(collab.groupId);
      const group = groupMap.get(groupIdStr);
      name = group?.name || '未知分组';
      avatar = group?.avatar || '';
      result.push({
        groupId: groupIdStr,
        teamId,
        permission: { value: collab.permission },
        name,
        avatar
      });
    } else if (collab.orgId) {
      const orgIdStr = String(collab.orgId);
      const org = orgMap.get(orgIdStr);
      name = org?.name || '未知组织';
      avatar = org?.avatar || '';
      result.push({
        orgId: orgIdStr,
        teamId,
        permission: { value: collab.permission },
        name,
        avatar
      });
    }
  }

  return result;
};

// 删除资源的所有协作者记录
export const deleteResourceCollaborators = async ({
  resourceType,
  resourceId,
  teamId,
  session
}: {
  resourceType: `${ResourceTypeEnum}`;
  resourceId: string;
  teamId: string;
  session?: ClientSession;
}): Promise<number> => {
  const result = await MongoCollaboratorModel.deleteMany(
    { teamId, resourceType, resourceId },
    { session }
  );
  return result.deletedCount;
};

// 批量更新协作者（通用处理器）
export type UpdateCollaboratorInput = {
  type?: `${CollaboratorTypeEnum}`;
  targetId?: string;
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  permission: number;
};

export type UpdateCollaboratorResult = {
  success: boolean;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
};

// 辅助函数：从协作者输入中提取标识符
const getCollaboratorId = (
  collab: UpdateCollaboratorInput
): { tmbId?: string; groupId?: string; orgId?: string } | null => {
  const { type, targetId, tmbId, groupId, orgId } = collab;

  if (tmbId) return { tmbId };
  if (groupId) return { groupId };
  if (orgId) return { orgId };

  if (type && targetId) {
    switch (type) {
      case CollaboratorTypeEnum.member:
        return { tmbId: targetId };
      case CollaboratorTypeEnum.group:
        return { groupId: targetId };
      case CollaboratorTypeEnum.org:
        return { orgId: targetId };
    }
  }

  return null;
};

export const updateCollaborators = async ({
  resourceType,
  resourceId,
  teamId,
  collaborators
}: {
  resourceType: `${ResourceTypeEnum}`;
  resourceId: string;
  teamId: string;
  collaborators: UpdateCollaboratorInput[];
}): Promise<UpdateCollaboratorResult> => {
  const teamIdObj = toObjectId(teamId);
  const isModelResource = resourceType === ResourceTypeEnumValues.model;
  const resourceIdValue = isModelResource ? resourceId : toObjectId(resourceId);

  // 1. 先删除该资源的所有协作者
  const deleteResult = await MongoCollaboratorModel.deleteMany({
    teamId: teamIdObj,
    resourceType,
    resourceId: resourceIdValue
  });

  // 2. 如果新列表为空，直接返回
  if (!collaborators || collaborators.length === 0) {
    return {
      success: true,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: deleteResult.deletedCount
    };
  }

  // 3. 批量插入新的协作者
  const insertDocs: {
    teamId: typeof teamIdObj;
    resourceType: `${ResourceTypeEnum}`;
    resourceId: typeof resourceIdValue;
    tmbId?: typeof teamIdObj;
    groupId?: typeof teamIdObj;
    orgId?: typeof teamIdObj;
    permission: number;
  }[] = [];

  for (const collab of collaborators) {
    const collabId = getCollaboratorId(collab);
    if (!collabId) continue;

    const doc: (typeof insertDocs)[0] = {
      teamId: teamIdObj,
      resourceType,
      resourceId: resourceIdValue,
      permission: collab.permission
    };

    if (collabId.tmbId) {
      doc.tmbId = toObjectId(collabId.tmbId);
    } else if (collabId.groupId) {
      doc.groupId = toObjectId(collabId.groupId);
    } else if (collabId.orgId) {
      doc.orgId = toObjectId(collabId.orgId);
    }

    insertDocs.push(doc);
  }

  if (insertDocs.length === 0) {
    return {
      success: true,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: deleteResult.deletedCount
    };
  }

  const insertResult = await MongoCollaboratorModel.insertMany(insertDocs);

  return {
    success: true,
    addedCount: insertResult.length,
    updatedCount: 0,
    deletedCount: deleteResult.deletedCount
  };
};

// 模型协作者输入类型 (前端格式)
export type ModelCollaboratorInput = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  permission: number;
};

// 批量更新模型协作者（支持多个模型）
export const updateModelCollaborators = async ({
  resourceType,
  models,
  teamId,
  collaborators
}: {
  resourceType: `${ResourceTypeEnum}`;
  models: string[];
  teamId: string;
  collaborators: ModelCollaboratorInput[];
}): Promise<UpdateCollaboratorResult> => {
  const bulkOps: {
    updateOne: {
      filter: Record<string, unknown>;
      update: { $set: Record<string, unknown> };
      upsert: boolean;
    };
  }[] = [];

  const teamIdObj = toObjectId(teamId);

  // 为每个模型的每个协作者创建操作
  for (const model of models) {
    for (const collab of collaborators) {
      const { tmbId, groupId, orgId, permission } = collab;

      const filter: Record<string, unknown> = {
        teamId: teamIdObj,
        resourceType,
        resourceId: model // 模型名称是字符串
      };

      const updateData: Record<string, unknown> = {
        teamId: teamIdObj,
        resourceType,
        resourceId: model,
        permission
      };

      // 确定协作者类型
      if (tmbId) {
        filter.tmbId = toObjectId(tmbId);
        updateData.tmbId = toObjectId(tmbId);
      } else if (groupId) {
        filter.groupId = toObjectId(groupId);
        updateData.groupId = toObjectId(groupId);
      } else if (orgId) {
        filter.orgId = toObjectId(orgId);
        updateData.orgId = toObjectId(orgId);
      } else {
        continue; // 跳过无效的协作者
      }

      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: updateData },
          upsert: true
        }
      });
    }
  }

  if (bulkOps.length === 0) {
    return { success: true, addedCount: 0, updatedCount: 0 };
  }

  const result = await MongoCollaboratorModel.bulkWrite(bulkOps);

  return {
    success: true,
    addedCount: result.upsertedCount,
    updatedCount: result.modifiedCount
  };
};

// 删除指定协作者（批量）
export const deleteCollaborators = async ({
  resourceType,
  resourceId,
  teamId,
  collaboratorIds
}: {
  resourceType: `${ResourceTypeEnum}`;
  resourceId: string;
  teamId: string;
  collaboratorIds: string[];
}): Promise<number> => {
  const result = await MongoCollaboratorModel.deleteMany({
    _id: { $in: collaboratorIds },
    teamId,
    resourceType,
    resourceId
  });
  return result.deletedCount;
};

// 删除单个协作者（按 tmbId/groupId/orgId）
export const deleteCollaborator = async ({
  resourceType,
  resourceId,
  teamId,
  tmbId,
  groupId,
  orgId
}: {
  resourceType: `${ResourceTypeEnum}`;
  resourceId: string;
  teamId: string;
  tmbId?: string;
  groupId?: string;
  orgId?: string;
}): Promise<void> => {
  const filter: Record<string, unknown> = {
    teamId: toObjectId(teamId),
    resourceType,
    resourceId: resourceType === ResourceTypeEnumValues.model ? resourceId : toObjectId(resourceId)
  };

  if (tmbId) {
    filter.tmbId = toObjectId(tmbId);
  } else if (groupId) {
    filter.groupId = toObjectId(groupId);
  } else if (orgId) {
    filter.orgId = toObjectId(orgId);
  } else {
    throw new Error('需要提供 tmbId、groupId 或 orgId 中的一个');
  }

  await MongoCollaboratorModel.deleteOne(filter);
};

/**
 * 获取团队成员权限
 * 基于 role 和资源协作者权限计算 TeamPermission
 */
export const getTeamMemberPermission = async ({
  teamId,
  tmbId,
  role
}: {
  teamId: string;
  tmbId: string;
  role: `${TeamMemberRoleEnum}`;
}): Promise<TeamPermission> => {
  // 如果是 owner，直接返回 owner 权限
  if (role === TeamMemberRoleEnum.owner) {
    return new TeamPermission({ isOwner: true });
  }

  // 查询团队级别的协作者权限
  const teamPermission = await calculatePermission({
    resourceType: ResourceTypeEnumValues.team,
    resourceId: teamId,
    tmbId,
    teamId
  });

  return new TeamPermission({ role: teamPermission });
};
