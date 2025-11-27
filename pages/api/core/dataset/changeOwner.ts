import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { connectionMongo } from '@fastgpt/service/common/mongo';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type RequestBody = {
  datasetId: string;
  newOwnerId: string; // 新所有者的 tmbId
};

type ResponseType = {
  success: boolean;
  message: string;
};

/**
 * 验证操作权限（只有管理员或当前所有者可以更改）
 */
async function validateOperationPermission(
  teamId: string,
  tmbId: string,
  datasetId: string
): Promise<{ hasPermission: boolean; reason?: string; currentOwnerId?: string }> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return { hasPermission: false, reason: '数据库连接失败' };
    }

    // 验证成员角色
    const member = await MongoTeamMemberModel.findById(tmbId).lean();
    if (!member) {
      return { hasPermission: false, reason: '成员不存在' };
    }

    // 查询数据集
    const datasetsCollection = db.collection('datasets');
    const dataset = await datasetsCollection.findOne({
      _id: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
      teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId)
    });

    if (!dataset) {
      return { hasPermission: false, reason: '数据集不存在或不属于该团队' };
    }

    const currentOwnerId = String(dataset.tmbId);
    const isOwner = currentOwnerId === tmbId;
    const isTeamOwner = member.role === TeamMemberRoleEnum.owner;

    // 团队 owner 直接有权限
    if (!isOwner && !isTeamOwner) {
      // 检查协作者权限
      const { getTeamMemberPermission } = await import('@fastgpt/service/support_permission/controller');
      const permission = await getTeamMemberPermission({
        teamId,
        tmbId,
        role: member.role as `${TeamMemberRoleEnum}`
      });

      if (!permission.hasManagePer) {
        return { hasPermission: false, reason: '只有管理员或数据集所有者可以更改所有者' };
      }
    }

    return { hasPermission: true, currentOwnerId };
  } catch {
    return { hasPermission: false, reason: '权限验证失败' };
  }
}

/**
 * 验证新所有者是否有效
 */
async function validateNewOwner(
  teamId: string,
  newOwnerId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // 验证 ObjectId 格式
    if (!connectionMongo.Types.ObjectId.isValid(newOwnerId)) {
      return { valid: false, reason: '新所有者 ID 格式无效' };
    }

    // 验证新所有者是团队成员
    const member = await MongoTeamMemberModel.findOne({
      _id: connectionMongo.Types.ObjectId.createFromHexString(newOwnerId),
      teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId),
      status: 'active'
    }).lean();

    if (!member) {
      return { valid: false, reason: '新所有者不是该团队的有效成员' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: '验证新所有者失败' };
  }
}

/**
 * 更改数据集所有者 API
 * POST /api/core/dataset/changeOwner
 */
async function handler(
  req: ApiRequestProps<RequestBody>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { datasetId, newOwnerId } = req.body;

  // 参数验证
  if (!datasetId) {
    return Promise.reject('datasetId 是必填参数');
  }

  if (!newOwnerId) {
    return Promise.reject('newOwnerId 是必填参数');
  }

  // 验证 datasetId 格式
  if (!connectionMongo.Types.ObjectId.isValid(datasetId)) {
    return Promise.reject('datasetId 格式无效');
  }

  // 验证操作权限
  const permissionResult = await validateOperationPermission(teamId, tmbId, datasetId);
  if (!permissionResult.hasPermission) {
    return Promise.reject(permissionResult.reason || '权限不足');
  }

  // 检查是否是同一个人
  if (permissionResult.currentOwnerId === newOwnerId) {
    return {
      success: true,
      message: '新所有者与当前所有者相同，无需更改'
    };
  }

  // 验证新所有者
  const newOwnerResult = await validateNewOwner(teamId, newOwnerId);
  if (!newOwnerResult.valid) {
    return Promise.reject(newOwnerResult.reason || '新所有者无效');
  }

  // 更新数据集所有者
  const db = connectionMongo.connection.db;
  if (!db) {
    return Promise.reject('数据库连接失败');
  }

  const datasetsCollection = db.collection('datasets');

  // 获取数据集名称用于审计日志
  const dataset = await datasetsCollection.findOne({
    _id: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
    teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId)
  });

  await datasetsCollection.updateOne(
    {
      _id: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
      teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId)
    },
    {
      $set: {
        tmbId: connectionMongo.Types.ObjectId.createFromHexString(newOwnerId),
        updateTime: new Date()
      }
    }
  );

  // 获取新所有者名称用于审计日志
  const newOwner = await MongoTeamMemberModel.findById(newOwnerId).lean();

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.TRANSFER_DATASET_OWNERSHIP,
    metadata: {
      datasetName: dataset?.name || datasetId,
      newOwnerName: newOwner?.name || newOwnerId
    }
  });

  return {
    success: true,
    message: '数据集所有者更改成功'
  };
}

export default NextAPI(handler);
