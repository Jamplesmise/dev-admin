import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoWxLoginSessionModel } from '@fastgpt/service/support_user/auth/schema';
import { MongoOAuthBindingModel } from '@fastgpt/service/support_user/auth/schema';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { generateAccessToken } from '@fastgpt/service/support_user/token';
import { WxLoginStatusEnum, OAuthProviderEnum } from '@fastgpt/global/support_user/auth/constants';
import { UserStatusEnum } from '@fastgpt/global/support_user/constants';
import { TeamMemberRoleEnum, TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';
import type {
  GetWxLoginResultRequest,
  GetWxLoginResultResponse,
  UserInfoType
} from '@fastgpt/global/support_user/auth/type';
import { connectionMongo } from '@fastgpt/service/common/mongo';

// 不需要认证中间件，这是登录流程本身
const NextAPI = NextEntry({ beforeCallback: [] });

/**
 * 获取微信登录结果
 * POST /api/support/user/account/login/wx/getResult
 *
 * 与 checkStatus 的区别:
 * - checkStatus: 仅检查扫码状态
 * - getResult: 检查状态 + 完成登录流程（创建用户、生成 token）
 */
async function handler(
  req: ApiRequestProps<GetWxLoginResultRequest>,
  _res: NextApiResponse
): Promise<GetWxLoginResultResponse> {
  const { code, inviterId, bd_vid, msclkid, fastgpt_sem, sourceDomain } = req.body;

  if (!code) {
    return Promise.reject('code is required');
  }

  // 查询登录会话 (code 可能是 sceneId)
  const session = await MongoWxLoginSessionModel.findOne({
    $or: [{ sceneId: code }, { ticket: code }]
  }).lean();

  if (!session) {
    return Promise.reject('扫码信息不存在或已过期');
  }

  // 检查是否过期
  if (new Date() > new Date(session.expireAt)) {
    return Promise.reject('扫码信息已过期');
  }

  // 检查扫码状态
  if (session.status !== WxLoginStatusEnum.confirmed) {
    return Promise.reject('用户尚未确认登录');
  }

  // 获取 openId
  const openId = session.openId;
  if (!openId) {
    return Promise.reject('微信授权信息不完整');
  }

  let isNewUser = false;
  let user: UserInfoType;
  let teamId: string;
  let tmbId: string;

  // 查找已绑定的用户
  const existingBinding = await MongoOAuthBindingModel.findOne({
    provider: OAuthProviderEnum.wechat,
    providerId: openId
  }).lean();

  if (existingBinding) {
    // 已有用户，更新登录时间
    const existingUser = await MongoUserModel.findByIdAndUpdate(
      existingBinding.userId,
      { lastLoginTime: new Date() },
      { new: true }
    ).lean();

    if (!existingUser) {
      return Promise.reject('用户不存在');
    }

    // 更新 OAuth 绑定的最后登录时间
    await MongoOAuthBindingModel.updateOne(
      { _id: existingBinding._id },
      { lastLoginTime: new Date() }
    );

    // 获取用户的默认团队
    const teamMember = await MongoTeamMemberModel.findOne({
      userId: existingUser._id
    }).lean();

    if (!teamMember) {
      return Promise.reject('用户团队信息不存在');
    }

    teamId = String(teamMember.teamId);
    tmbId = String(teamMember._id);

    user = {
      _id: String(existingUser._id),
      username: existingUser.username,
      avatar: existingUser.avatar,
      status: existingUser.status,
      createTime: existingUser.createTime.toISOString()
    };
  } else {
    // 新用户，创建用户和默认团队
    isNewUser = true;

    const mongoSession = await connectionMongo.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        // 创建用户
        const newUser = await MongoUserModel.create(
          [
            {
              username: `微信用户_${openId.slice(-6)}`,
              avatar: '',
              status: UserStatusEnum.active,
              lastLoginTime: new Date()
            }
          ],
          { session: mongoSession }
        );

        const createdUser = newUser[0];

        // 创建 OAuth 绑定
        await MongoOAuthBindingModel.create(
          [
            {
              userId: createdUser._id,
              provider: OAuthProviderEnum.wechat,
              providerId: openId,
              profile: {
                nickname: createdUser.username
              },
              bindTime: new Date(),
              lastLoginTime: new Date()
            }
          ],
          { session: mongoSession }
        );

        // 创建默认团队
        const newTeam = await MongoTeamModel.create(
          [
            {
              name: `${createdUser.username}的团队`,
              ownerId: createdUser._id,
              avatar: '',
              balance: 0
            }
          ],
          { session: mongoSession }
        );

        const createdTeam = newTeam[0];

        // 创建团队成员关系
        const newMember = await MongoTeamMemberModel.create(
          [
            {
              teamId: createdTeam._id,
              userId: createdUser._id,
              name: createdUser.username,
              role: TeamMemberRoleEnum.owner,
              status: TeamMemberStatusEnum.active
            }
          ],
          { session: mongoSession }
        );

        teamId = String(createdTeam._id);
        tmbId = String(newMember[0]._id);

        user = {
          _id: String(createdUser._id),
          username: createdUser.username,
          avatar: createdUser.avatar || '',
          status: createdUser.status,
          createTime: createdUser.createTime.toISOString()
        };
      });
    } finally {
      await mongoSession.endSession();
    }
  }

  // 更新微信登录会话，标记已使用
  await MongoWxLoginSessionModel.updateOne(
    { _id: session._id },
    { userId: user._id }
  );

  // 生成 JWT Token
  const token = generateAccessToken({
    userId: user._id,
    teamId,
    tmbId
  });

  return {
    user,
    token,
    isNewUser
  };
}

export default NextAPI(handler);
