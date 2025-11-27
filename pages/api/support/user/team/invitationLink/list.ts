import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { getInvitationLinksByTeam } from '@fastgpt/service/support_user/team/invitationLink/controller';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端期望的返回格式 (InvitationType)
 */
type InvitationType = {
  _id: string;
  linkId: string;
  teamId: string;
  usedTimesLimit?: number;
  forbidden?: boolean;
  expires: Date;
  description: string;
  members: {
    tmbId: string;
    avatar: string;
    name: string;
  }[];
};

/**
 * 获取团队邀请链接列表
 * GET /api/support/user/team/invitationLink/list
 *
 * 前端期望返回：InvitationType[]
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<InvitationType[]> {
  const teamId = getTeamIdFromReq(req);

  // 获取邀请链接列表
  const links = await getInvitationLinksByTeam(teamId);

  // TODO: 获取通过该邀请链接加入的成员信息
  // 目前 schema 没有存储 members 关联，暂时返回空数组
  // 如果需要实现，可以在 accept 时记录 linkId 到成员表，或单独建立关联表

  // 转换响应格式
  const list: InvitationType[] = links.map((link) => ({
    _id: String(link._id),
    linkId: link.linkId,
    teamId: String(link.teamId),
    usedTimesLimit: link.maxUsage === 0 ? -1 : link.maxUsage, // 0 表示无限制，转为 -1
    forbidden: link.status === 'disabled',
    expires: link.expireTime,
    description: link.description || '',
    members: [] // TODO: 获取通过该链接加入的成员
  }));

  return list;
}

export default NextAPI(handler);
