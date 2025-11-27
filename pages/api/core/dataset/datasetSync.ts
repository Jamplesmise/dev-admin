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
  syncMode?: 'manual' | 'auto';
};

type ResponseType = {
  taskId: string;
  status: 'queued' | 'running';
};

/**
 * 验证数据集权限
 */
async function validateDatasetPermission(
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
          return { hasPermission: false, reason: '没有同步数据集的权限' };
        }
      }
    }

    return { hasPermission: true };
  } catch {
    return { hasPermission: false, reason: '权限验证失败' };
  }
}

/**
 * 检查是否有进行中的同步任务
 */
async function checkExistingSyncTask(
  teamId: string,
  datasetId: string
): Promise<{ exists: boolean; taskId?: string }> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return { exists: false };
    }

    // 查询同步任务表（假设表名为 dataset_sync_tasks）
    const syncTasksCollection = db.collection('dataset_sync_tasks');
    const existingTask = await syncTasksCollection.findOne({
      teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId),
      datasetId: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
      status: { $in: ['queued', 'running'] }
    });

    if (existingTask) {
      return { exists: true, taskId: String(existingTask._id) };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * 创建同步任务
 */
async function createSyncTask(
  teamId: string,
  tmbId: string,
  datasetId: string,
  syncMode: 'manual' | 'auto'
): Promise<string> {
  const db = connectionMongo.connection.db;
  if (!db) {
    throw new Error('数据库连接失败');
  }

  const syncTasksCollection = db.collection('dataset_sync_tasks');
  const taskId = getNanoid();

  await syncTasksCollection.insertOne({
    taskId,
    teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId),
    tmbId: connectionMongo.Types.ObjectId.createFromHexString(tmbId),
    datasetId: connectionMongo.Types.ObjectId.createFromHexString(datasetId),
    syncMode,
    status: 'queued',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return taskId;
}

/**
 * 数据集同步 API
 * POST /api/core/dataset/datasetSync
 */
async function handler(
  req: ApiRequestProps<RequestBody>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { datasetId, syncMode = 'manual' } = req.body;

  // 参数验证
  if (!datasetId) {
    return Promise.reject('datasetId 是必填参数');
  }

  // 验证 ObjectId 格式
  if (!connectionMongo.Types.ObjectId.isValid(datasetId)) {
    return Promise.reject('datasetId 格式无效');
  }

  // 验证权限
  const permissionResult = await validateDatasetPermission(teamId, tmbId, datasetId);
  if (!permissionResult.hasPermission) {
    return Promise.reject(permissionResult.reason || '权限不足');
  }

  // 检查是否有进行中的同步任务
  const existingTask = await checkExistingSyncTask(teamId, datasetId);
  if (existingTask.exists) {
    return {
      taskId: existingTask.taskId!,
      status: 'running'
    };
  }

  // 创建同步任务
  const taskId = await createSyncTask(teamId, tmbId, datasetId, syncMode);

  return {
    taskId,
    status: 'queued'
  };
}

export default NextAPI(handler);
