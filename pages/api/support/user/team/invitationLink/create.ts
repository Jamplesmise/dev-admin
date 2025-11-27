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
import { createInvitationLink } from '@fastgpt/service/support_user/team/invitationLink/controller';
import { getTeamMemberPermission } from '@fastgpt/service/support_permission/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 前端传入的过期时间类型
type InvitationLinkExpiresType = '30m' | '7d' | '1y';

// 前端请求参数格式
type CreateInvitationLinkRequest = {
  description: string;
  expires: InvitationLinkExpiresType;
  usedTimesLimit: 1 | -1;
};

/**
 * 将前端过期时间格式转换为天数
 */
function expiresTypeToDays(expires: InvitationLinkExpiresType): number {
  switch (expires) {
    case '30m':
      return 1; // 最小1天，30分钟按1天处理（或者修改schema支持分钟）
    case '7d':
      return 7;
    case '1y':
      return 365;
    default:
      return 7;
  }
}

/**
 * 将前端过期时间格式转换为过期时间
 */
function expiresTypeToDate(expires: InvitationLinkExpiresType): Date {
  const now = new Date();
  switch (expires) {
    case '30m':
      return new Date(now.getTime() + 30 * 60 * 1000); // 30分钟
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天
    case '1y':
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * 创建邀请链接
 * POST /api/support/user/team/invitationLink/create
 *
 * 前端期望返回：linkId 字符串
 */
async function handler(
  req: ApiRequestProps<CreateInvitationLinkRequest>,
  _res: NextApiResponse
): Promise<string> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { description, expires = '7d', usedTimesLimit = -1 } = req.body;

  // 检查当前用户权限（必须是 owner 或有管理权限）
  const currentMember = await MongoTeamMemberModel.findOne({
    _id: tmbId,
    teamId
  }).lean();

  if (!currentMember) {
    throw new Error('当前用户不是该团队成员');
  }

  const permission = await getTeamMemberPermission({
    teamId,
    tmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!permission.isOwner && !permission.hasManagePer) {
    throw new Error('没有权限创建邀请链接');
  }

  // 转换参数
  const expireDays = expiresTypeToDays(expires);
  // usedTimesLimit: 1 表示只能使用1次，-1 表示无限制（转为 0）
  const maxUsage = usedTimesLimit === -1 ? 0 : usedTimesLimit;

  // 创建邀请链接
  const link = await createInvitationLink({
    teamId,
    creatorTmbId: tmbId,
    maxUsage,
    expireDays,
    description
  });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CREATE_INVITATION_LINK,
    metadata: { link: link.linkId }
  });

  // 返回 linkId 字符串（前端期望格式）
  return link.linkId;
}

export default NextAPI(handler);
