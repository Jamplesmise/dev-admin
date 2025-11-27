import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';

/**
 * @deprecated 此 API 已废弃
 * 官方 FastGPT 已移除 waiting 状态，邀请通过 invitationLink 实现
 * 用户通过邀请链接加入团队后直接变为 active 状态
 */

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type UpdateInviteRequest = {
  tmbId: string;
  status: 'accept' | 'reject';
};

type UpdateInviteResponse = {
  success: boolean;
  message: string;
};

/**
 * @deprecated 已废弃 - 使用 invitationLink 系统替代
 */
async function handler(
  _req: ApiRequestProps<UpdateInviteRequest>,
  _res: NextApiResponse
): Promise<UpdateInviteResponse> {
  // 此 API 已废弃，邀请功能通过 invitationLink 系统实现
  // 参见：/api/support/user/team/invitationLink/accept
  throw new Error('此 API 已废弃，请使用邀请链接系统');
}

export default NextAPI(handler);
