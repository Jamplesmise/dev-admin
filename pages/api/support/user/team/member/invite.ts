import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { TeamMemberStatusEnum, TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type InviteMemberProps = {
  teamId?: string; // 官方接口需要，但我们从认证中获取
  usernames: string[];
};

type InviteMemberResponse = Record<
  'invite' | 'inValid' | 'inTeam',
  { username: string; userId: string }[]
>;

/**
 * 邀请成员加入团队
 * POST /api/support/user/team/member/invite
 *
 * 根据用户名邀请用户加入当前团队
 * - invite: 成功邀请的用户列表
 * - inValid: 无效的用户名（不存在）
 * - inTeam: 已在团队中的用户
 */
async function handler(
  req: ApiRequestProps<InviteMemberProps>,
  _res: NextApiResponse
): Promise<InviteMemberResponse> {
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);
  const { usernames } = req.body;

  if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
    throw new Error('请提供要邀请的用户名列表');
  }

  const result: InviteMemberResponse = {
    invite: [],
    inValid: [],
    inTeam: []
  };

  // 1. 查找所有用户（根据用户名或邮箱）
  const users = await MongoUserModel.find({
    $or: [
      { username: { $in: usernames } },
      { email: { $in: usernames } }
    ]
  }).lean();

  // 构建用户名到用户的映射
  const usernameToUser = new Map<string, typeof users[0]>();
  users.forEach(user => {
    usernameToUser.set(user.username, user);
    if (user.email) {
      usernameToUser.set(user.email, user);
    }
  });

  // 2. 查找已在团队中的成员
  const userIds = users.map(u => u._id);
  const existingMembers = await MongoTeamMemberModel.find({
    teamId,
    userId: { $in: userIds }
  }).lean();

  const existingUserIds = new Set(existingMembers.map(m => String(m.userId)));

  // 3. 分类处理每个用户名
  for (const username of usernames) {
    const user = usernameToUser.get(username);

    if (!user) {
      // 用户不存在
      result.inValid.push({ username, userId: '' });
      continue;
    }

    const userId = String(user._id);

    if (existingUserIds.has(userId)) {
      // 已在团队中
      result.inTeam.push({ username, userId });
      continue;
    }

    // 4. 创建新的团队成员（active 状态，因为官方没有 waiting 状态）
    // 官方的邀请流程是通过 invitationLink 实现的
    try {
      await MongoTeamMemberModel.create({
        teamId,
        userId: user._id,
        name: user.username,
        avatar: user.avatar || '',
        role: TeamMemberRoleEnum.owner, // 官方只有 owner 角色，权限通过 TeamPermission 控制
        status: TeamMemberStatusEnum.active
      });

      result.invite.push({ username, userId });
      // 标记为已处理，避免重复添加
      existingUserIds.add(userId);
    } catch (error) {
      // 可能是并发创建导致的重复，视为已在团队中
      result.inTeam.push({ username, userId });
    }
  }

  // 记录审计日志（只记录成功邀请的成员）
  if (result.invite.length > 0) {
    for (const invited of result.invite) {
      await addAuditLog({
        teamId,
        tmbId: currentTmbId,
        event: AuditEventEnum.JOIN_TEAM,
        metadata: { link: `invite:${invited.username}` }
      });
    }
  }

  return result;
}

export default NextAPI(handler);
