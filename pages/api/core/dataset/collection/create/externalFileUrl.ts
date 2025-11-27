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
import { getNanoid } from '@fastgpt/global/common/string/tools';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type RequestBody = {
  datasetId: string;
  externalFileUrl: string;
  name?: string;
  metadata?: Record<string, unknown>;
};

type ResponseType = {
  collectionId: string;
  status: 'queued' | 'processing';
};

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证数据集权限（需要写权限）
 */
async function validateDatasetWritePermission(
  teamId: string,
  tmbId: string,
  datasetId: string
): Promise<{ hasPermission: boolean; reason?: string }> {
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

    // 检查是否是数据集所有者或团队 owner
    const isOwner = String(dataset.tmbId) === tmbId;
    const isTeamOwner = member.role === TeamMemberRoleEnum.owner;

    if (!isOwner && !isTeamOwner) {
      // 检查团队级别管理权限
      const { getTeamMemberPermission } = await import('@fastgpt/service/support_permission/controller');
      const permission = await getTeamMemberPermission({
        teamId,
        tmbId,
        role: member.role as `${TeamMemberRoleEnum}`
      });

      if (!permission.hasManagePer) {
        // 检查协作者权限
        const collaboratorsCollection = db.collection('collaborators');
        const collaborator = await collaboratorsCollection.findOne({
          teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId),
          resourceId: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
          resourceType: 'dataset',
          tmbId: connectionMongo.Types.ObjectId.createFromHexString(tmbId)
        });

        // 需要写权限 (permission >= 2)
        if (!collaborator || collaborator.permission < 2) {
          return { hasPermission: false, reason: '没有向该数据集添加集合的权限' };
        }
      }
    }

    return { hasPermission: true };
  } catch {
    return { hasPermission: false, reason: '权限验证失败' };
  }
}

/**
 * 创建外部文件集合
 */
async function createExternalFileCollection(
  teamId: string,
  tmbId: string,
  datasetId: string,
  externalFileUrl: string,
  name?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const db = connectionMongo.connection.db;
  if (!db) {
    throw new Error('数据库连接失败');
  }

  const collectionsTable = db.collection('dataset_collections');
  const collectionId = getNanoid();

  // 从 URL 提取文件名作为默认名称
  let collectionName = name;
  if (!collectionName) {
    try {
      const urlObj = new URL(externalFileUrl);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'external_file';
      collectionName = decodeURIComponent(fileName);
    } catch {
      collectionName = 'external_file';
    }
  }

  await collectionsTable.insertOne({
    collectionId,
    teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId),
    tmbId: connectionMongo.Types.ObjectId.createFromHexString(tmbId),
    datasetId: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
    name: collectionName,
    type: 'externalFile',
    externalFileUrl,
    metadata: metadata || {},
    status: 'queued',
    createTime: new Date(),
    updateTime: new Date()
  });

  return collectionId;
}

/**
 * 外部文件集合 API
 * POST /api/core/dataset/collection/create/externalFileUrl
 */
async function handler(
  req: ApiRequestProps<RequestBody>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { datasetId, externalFileUrl, name, metadata } = req.body;

  // 参数验证
  if (!datasetId) {
    return Promise.reject('datasetId 是必填参数');
  }

  if (!externalFileUrl) {
    return Promise.reject('externalFileUrl 是必填参数');
  }

  // 验证 datasetId 格式
  if (!connectionMongo.Types.ObjectId.isValid(datasetId)) {
    return Promise.reject('datasetId 格式无效');
  }

  // 验证 URL 格式
  if (!isValidUrl(externalFileUrl)) {
    return Promise.reject('externalFileUrl 格式无效，必须是有效的 HTTP/HTTPS URL');
  }

  // 验证权限
  const permissionResult = await validateDatasetWritePermission(teamId, tmbId, datasetId);
  if (!permissionResult.hasPermission) {
    return Promise.reject(permissionResult.reason || '权限不足');
  }

  // 创建集合
  const collectionId = await createExternalFileCollection(
    teamId,
    tmbId,
    datasetId,
    externalFileUrl,
    name,
    metadata
  );

  return {
    collectionId,
    status: 'queued'
  };
}

export default NextAPI(handler);
