import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support_user_team/constant';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 免费用户最多创建的团队数量
const FREE_USER_MAX_TEAMS = 3;

type CreateTeamRequest = {
  name: string;
  avatar?: string;
};

type CreateTeamResponse = {
  teamId: string;
  name: string;
  avatar: string;
};

/**
 * 创建新团队
 * POST /api/support/user/team/create
 */
async function handler(
  req: ApiRequestProps<CreateTeamRequest>,
  _res: NextApiResponse
): Promise<CreateTeamResponse> {
  const userId = getUserIdFromReq(req);
  const { name, avatar } = req.body;

  // 参数验证
  if (!name || name.trim().length === 0) {
    throw new Error('团队名称不能为空');
  }

  if (name.trim().length > 100) {
    throw new Error('团队名称不能超过 100 个字符');
  }

  // 检查用户创建的团队数量
  const userTeamCount = await MongoTeamModel.countDocuments({ ownerId: userId });
  if (userTeamCount >= FREE_USER_MAX_TEAMS) {
    throw new Error(`已达团队数量上限（最多 ${FREE_USER_MAX_TEAMS} 个）`);
  }

  // 获取用户信息（用于设置默认成员名称）
  const user = await MongoUserModel.findById(userId).lean();
  const memberName = user?.username || '团队创建者';

  // 1. 创建团队记录
  const team = await MongoTeamModel.create({
    name: name.trim(),
    ownerId: userId,
    avatar: avatar || '',
    balance: 0,
    teamDomain: ''
  });

  // 2. 创建团队成员记录（owner）
  await MongoTeamMemberModel.create({
    teamId: team._id,
    userId,
    name: memberName,
    role: TeamMemberRoleEnum.owner,
    status: TeamMemberStatusEnum.active,
    avatar: user?.avatar || ''
  });

  return {
    teamId: String(team._id),
    name: team.name,
    avatar: team.avatar
  };
}

export default NextAPI(handler);
