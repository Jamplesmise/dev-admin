import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getUserIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamMemberStatusEnum, TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type GetTeamListQuery = {
  status?: `${TeamMemberStatusEnum}`;
};

/**
 * 构建权限对象
 * 模拟 TeamPermission 类序列化后的结构
 */
function buildTeamPermission(isOwner: boolean) {
  const OwnerPermissionVal = ~0 >>> 0; // 4294967295
  const ReadPermissionVal = 0b100; // 4

  return {
    role: isOwner ? OwnerPermissionVal : ReadPermissionVal,
    isOwner,
    hasManagePer: isOwner,
    hasWritePer: isOwner,
    hasReadPer: true,
    hasManageRole: isOwner,
    hasWriteRole: isOwner,
    hasReadRole: true,
    // TeamPermission 特有的属性
    hasAppCreateRole: isOwner,
    hasDatasetCreateRole: isOwner,
    hasApikeyCreateRole: isOwner,
    hasAppCreatePer: isOwner,
    hasDatasetCreatePer: isOwner,
    hasApikeyCreatePer: isOwner
  };
}

/**
 * 获取用户的团队列表
 * GET /api/support/user/team/list
 *
 * 返回用户所属的所有团队，包含完整的 TeamPermission 对象
 */
async function handler(
  req: ApiRequestProps<unknown, GetTeamListQuery>,
  _res: NextApiResponse
): Promise<any[]> {
  const userId = getUserIdFromReq(req);
  const { status = TeamMemberStatusEnum.active } = req.query;

  // 从 MongoDB 查询用户的团队成员关系
  const teamMembers = await MongoTeamMemberModel.find({
    userId,
    status
  }).lean();

  if (!teamMembers || teamMembers.length === 0) {
    return [];
  }

  // 获取团队详情
  const teamIds = teamMembers.map((tm) => tm.teamId);
  const teams = await MongoTeamModel.find({
    _id: { $in: teamIds }
  }).lean();

  // 构建团队 ID 到团队的映射
  const teamMap = new Map<string, typeof teams[0]>();
  teams.forEach((team) => {
    teamMap.set(String(team._id), team);
  });

  // 组装返回数据
  const result: TeamTmbItemType[] = teamMembers.map((tm) => {
    const team = teamMap.get(String(tm.teamId));
    const isOwner = tm.role === TeamMemberRoleEnum.owner;

    // 创建 TeamPermission 实例
    // owner 拥有所有权限，否则从成员的 permission 值创建
    const permission = new TeamPermission({
      isOwner,
      role: isOwner ? undefined : (tm as any).permission || 0
    });

    return {
      userId: String(tm.userId),
      teamId: String(tm.teamId),
      teamAvatar: team?.avatar || '',
      teamName: team?.name || '未知团队',
      memberName: tm.name,
      avatar: tm.avatar || '',
      balance: team?.balance || 0,
      tmbId: String(tm._id),
      teamDomain: team?.teamDomain || '',
      role: tm.role,
      status: tm.status,
      notificationAccount: team?.notificationAccount,
      permission,
      // 第三方账户
      lafAccount: team?.lafAccount,
      openaiAccount: team?.openaiAccount,
      externalWorkflowVariables: team?.externalWorkflowVariables
    };
  });

  return result;
}

export default NextAPI(handler);
