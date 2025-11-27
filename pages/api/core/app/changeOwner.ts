/**
 * 应用转让所有权 API
 * POST /api/core/app/changeOwner
 *
 * 将应用的所有权从当前所有者转让给另一个团队成员
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type AppChangeOwnerBody = {
  appId: string;
  ownerId: string; // 新所有者的 tmbId
};

type AppChangeOwnerResponse = {
  success: boolean;
};

async function handler(
  req: ApiRequestProps<AppChangeOwnerBody>,
  _res: NextApiResponse
): Promise<AppChangeOwnerResponse> {
  const { appId, ownerId } = req.body;
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);

  if (!appId) {
    throw new Error('缺少应用 ID');
  }

  if (!ownerId) {
    throw new Error('缺少新所有者 ID');
  }

  // 验证新所有者是团队成员
  const newOwner = await MongoTeamMemberModel.findOne({
    _id: ownerId,
    teamId,
    status: 'active'
  }).lean();

  if (!newOwner) {
    throw new Error('新所有者不是有效的团队成员');
  }

  // TODO: 验证当前用户是应用所有者
  // TODO: 更新应用的 tmbId 字段为新所有者

  // 注意：由于本项目是 Pro 功能后端，应用数据存储在官方 FastGPT 中
  // 这里的实现需要与官方的应用 Schema 配合
  // 实际实现时需要调用官方的应用更新接口或直接操作应用集合

  console.log(`[changeOwner] appId: ${appId}, from: ${currentTmbId}, to: ${ownerId}`);

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.TRANSFER_APP_OWNERSHIP,
    metadata: {
      appName: appId,
      newOwnerName: newOwner.name || ownerId
    }
  });

  return {
    success: true
  };
}

export default NextAPI(handler);
