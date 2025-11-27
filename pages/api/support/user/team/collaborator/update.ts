/**
 * 更新团队协作者权限 API
 * POST /api/support/user/team/collaborator/update
 *
 * 批量更新团队协作者权限（upsert 模式）
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoCollaboratorModel } from '@fastgpt/service/support_permission/collaborator/schema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { Types } from 'mongoose';
import { getTeamMemberPermission } from '@fastgpt/service/support_permission/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 单个协作者输入
type CollaboratorInput = {
  permission: number;
  tmbId?: string;
  groupId?: string;
  orgId?: string;
};

// 请求体类型
type BodyType = {
  collaborators: CollaboratorInput[];
};

// 响应类型
type ResponseType = {
  success: boolean;
  addedCount: number;
  updatedCount: number;
};

// 验证权限值是否有效
// 团队权限是 6 位：apikeyCreate(32) + datasetCreate(16) + appCreate(8) + read(4) + write(2) + manage(1)
// 最大值 = 0b111111 = 63
function isValidPermission(permission: number): boolean {
  return Number.isInteger(permission) && permission >= 0 && permission <= 63;
}

async function handler(
  req: ApiRequestProps<BodyType>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { collaborators } = req.body;

  // 参数验证
  if (!collaborators || !Array.isArray(collaborators)) {
    throw new Error('collaborators 参数必须是数组');
  }

  if (collaborators.length === 0) {
    return { success: true, addedCount: 0, updatedCount: 0 };
  }

  const teamIdObj = new Types.ObjectId(teamId);

  // 权限验证：只有 owner 或有管理权限的用户可以操作
  const currentMember = await MongoTeamMemberModel.findById(tmbId).lean();
  if (!currentMember) {
    throw new Error('当前用户不是团队成员');
  }

  const memberPermission = await getTeamMemberPermission({
    teamId,
    tmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!memberPermission.isOwner && !memberPermission.hasManagePer) {
    throw new Error('只有团队所有者或管理员可以管理协作者权限');
  }

  // 获取团队 owner 的 tmbId，用于保护 owner 权限不被修改
  const ownerMember = await MongoTeamMemberModel.findOne({
    teamId: teamIdObj,
    role: TeamMemberRoleEnum.owner
  }).lean();

  const ownerTmbId = ownerMember ? String(ownerMember._id) : null;

  // 验证并构建 bulkWrite 操作
  const bulkOps: {
    updateOne: {
      filter: Record<string, unknown>;
      update: { $set: Record<string, unknown> };
      upsert: boolean;
    };
  }[] = [];

  for (const collab of collaborators) {
    const { permission, tmbId: collabTmbId, groupId, orgId } = collab;

    // 验证必须有且仅有一个协作者标识
    const types = [collabTmbId, groupId, orgId].filter(Boolean);
    if (types.length !== 1) {
      throw new Error('每个协作者必须指定且仅指定一个标识 (tmbId/groupId/orgId)');
    }

    // 验证权限值
    if (!isValidPermission(permission)) {
      throw new Error(`无效的权限值: ${permission}，必须在 0-63 之间`);
    }

    // 保护 owner 权限不被修改
    if (collabTmbId && collabTmbId === ownerTmbId) {
      throw new Error('不能修改团队所有者的权限');
    }

    const filter: Record<string, unknown> = {
      teamId: teamIdObj,
      resourceType: ResourceTypeEnum.team
    };

    const updateData: Record<string, unknown> = {
      teamId: teamIdObj,
      resourceType: ResourceTypeEnum.team,
      permission
    };

    if (collabTmbId) {
      filter.tmbId = new Types.ObjectId(collabTmbId);
      updateData.tmbId = new Types.ObjectId(collabTmbId);
    } else if (groupId) {
      filter.groupId = new Types.ObjectId(groupId);
      updateData.groupId = new Types.ObjectId(groupId);
    } else if (orgId) {
      filter.orgId = new Types.ObjectId(orgId);
      updateData.orgId = new Types.ObjectId(orgId);
    }

    bulkOps.push({
      updateOne: {
        filter,
        update: { $set: updateData },
        upsert: true
      }
    });
  }

  // 执行批量操作
  const result = await MongoCollaboratorModel.bulkWrite(bulkOps);

  // 记录审计日志（批量操作只记录一条）
  if (collaborators.length > 0) {
    const targetNames = collaborators
      .map((c) => c.tmbId || c.groupId || c.orgId)
      .filter(Boolean)
      .join(', ');
    await addAuditLog({
      teamId,
      tmbId,
      event: AuditEventEnum.ASSIGN_PERMISSION,
      metadata: {
        objectName: `${collaborators.length} 个对象`,
        permission: String(collaborators[0].permission)
      }
    });
  }

  return {
    success: true,
    addedCount: result.upsertedCount,
    updatedCount: result.modifiedCount
  };
}

export default NextAPI(handler);
