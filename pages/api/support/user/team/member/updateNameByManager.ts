import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { getTeamMemberPermission } from '@fastgpt/service/support_permission/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端参数格式
 * PUT { tmbId, name }
 */
type UpdateNameByManagerRequest = {
  tmbId: string;
  name: string; // 前端使用 name，不是 memberName
};

type UpdateNameByManagerResponse = {
  success: boolean;
};

/**
 * 管理员更新成员名称
 * PUT /api/support/user/team/member/updateNameByManager
 */
async function handler(
  req: ApiRequestProps<UpdateNameByManagerRequest>,
  _res: NextApiResponse
): Promise<UpdateNameByManagerResponse> {
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);
  const { tmbId, name } = req.body;

  // 参数验证
  if (!tmbId) {
    throw new Error('缺少成员 ID');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('成员名称不能为空');
  }

  if (name.trim().length > 50) {
    throw new Error('成员名称不能超过 50 个字符');
  }

  // 检查当前用户权限（必须是 owner 或有管理权限）
  const currentMember = await MongoTeamMemberModel.findOne({
    _id: currentTmbId,
    teamId
  }).lean();

  if (!currentMember) {
    throw new Error('当前用户不是该团队成员');
  }

  const permission = await getTeamMemberPermission({
    teamId,
    tmbId: currentTmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!permission.isOwner && !permission.hasManagePer) {
    throw new Error('没有权限修改成员名称');
  }

  // 检查目标成员是否存在
  const targetMember = await MongoTeamMemberModel.findOne({
    _id: tmbId,
    teamId
  }).lean();

  if (!targetMember) {
    throw new Error('目标成员不存在');
  }

  // 更新成员名称
  await MongoTeamMemberModel.updateOne(
    { _id: tmbId, teamId },
    { name: name.trim() }
  );

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.CHANGE_MEMBER_NAME,
    metadata: { memberName: targetMember.name || '未知', newName: name.trim() }
  });

  return { success: true };
}

export default NextAPI(handler);
