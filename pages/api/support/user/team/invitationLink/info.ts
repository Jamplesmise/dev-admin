import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { optionalAuthMiddleware } from '@fastgpt/service/common/middle/authMiddleware';
import {
  getInvitationLinkByLinkId,
  validateInvitationLink
} from '@fastgpt/service/support_user/team/invitationLink/controller';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';

// 使用可选认证，允许未登录用户查看邀请信息
const NextAPI = NextEntry({ beforeCallback: [optionalAuthMiddleware] });

type GetInvitationInfoQuery = {
  linkId: string;
};

/**
 * 前端期望的返回格式 (InvitationInfoType = InvitationSchemaType & { teamAvatar, teamName })
 */
type InvitationInfoType = {
  _id: string;
  linkId: string;
  teamId: string;
  usedTimesLimit?: number;
  forbidden?: boolean;
  expires: Date;
  description: string;
  members: string[];
  teamAvatar: string;
  teamName: string;
};

/**
 * 获取邀请链接信息（用于展示邀请页面）
 * GET /api/support/user/team/invitationLink/info?linkId=xxx
 *
 * 前端期望返回：InvitationInfoType
 */
async function handler(
  req: ApiRequestProps<unknown, GetInvitationInfoQuery>,
  _res: NextApiResponse
): Promise<InvitationInfoType> {
  const { linkId } = req.query;

  // 参数验证
  if (!linkId) {
    throw new Error('缺少邀请链接 ID');
  }

  // 获取邀请链接
  const link = await getInvitationLinkByLinkId(linkId as string);
  if (!link) {
    throw new Error('邀请链接不存在');
  }

  // 验证邀请链接有效性
  const validation = validateInvitationLink(link);
  if (!validation.valid) {
    throw new Error(validation.reason || '邀请链接无效');
  }

  // 获取团队信息
  const team = await MongoTeamModel.findById(link.teamId).lean();
  if (!team) {
    throw new Error('团队不存在');
  }

  return {
    _id: String(link._id),
    linkId: link.linkId,
    teamId: String(link.teamId),
    usedTimesLimit: link.maxUsage === 0 ? -1 : link.maxUsage,
    forbidden: link.status === 'disabled',
    expires: link.expireTime,
    description: link.description || '',
    members: [], // TODO: 获取通过该链接加入的成员
    teamAvatar: team.avatar || '',
    teamName: team.name
  };
}

export default NextAPI(handler);
