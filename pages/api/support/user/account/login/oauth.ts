import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoOAuthBindingModel } from '@fastgpt/service/support_user/auth/schema';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { OAuthProviderEnum } from '@fastgpt/global/support_user/auth/constants';
import type {
  OAuthLoginRequest,
  OAuthLoginResponse
} from '@fastgpt/global/support_user/auth/type';
import type { UserInfoType } from '@fastgpt/global/support_user/type';
import { generateAccessToken } from '@fastgpt/service/support_user/token';

const NextAPI = NextEntry({ beforeCallback: [] });

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Google OAuth 配置
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// 通过 code 获取 GitHub 用户信息
async function getGitHubUser(
  code: string
): Promise<{ id: string; login: string; avatar_url: string; email?: string }> {
  // 获取 access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    })
  });
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    throw new Error(tokenData.error_description || 'GitHub 授权失败');
  }

  // 获取用户信息
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });
  const userData = await userRes.json();

  return userData;
}

// 通过 code 获取 Google 用户信息
async function getGoogleUser(
  code: string,
  redirectUri?: string
): Promise<{ sub: string; name: string; picture: string; email?: string }> {
  // 获取 access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri || ''
    })
  });
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    throw new Error(tokenData.error_description || 'Google 授权失败');
  }

  // 获取用户信息
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });
  const userData = await userRes.json();

  return userData;
}

async function handler(
  req: ApiRequestProps<OAuthLoginRequest>,
  _res: NextApiResponse
): Promise<OAuthLoginResponse> {
  const { provider, code, redirectUri } = req.body;

  if (!provider || !code) {
    throw new Error('缺少必要参数: provider 和 code 为必填项');
  }

  if (!Object.values(OAuthProviderEnum).includes(provider)) {
    throw new Error(`不支持的登录方式: ${provider}`);
  }

  let providerId: string;
  let profile: { nickname?: string; avatar?: string; email?: string } = {};

  // 根据不同提供商获取用户信息
  switch (provider) {
    case OAuthProviderEnum.github: {
      const githubUser = await getGitHubUser(code);
      providerId = String(githubUser.id);
      profile = {
        nickname: githubUser.login,
        avatar: githubUser.avatar_url,
        email: githubUser.email
      };
      break;
    }
    case OAuthProviderEnum.google: {
      const googleUser = await getGoogleUser(code, redirectUri);
      providerId = googleUser.sub;
      profile = {
        nickname: googleUser.name,
        avatar: googleUser.picture,
        email: googleUser.email
      };
      break;
    }
    default:
      throw new Error('暂不支持此登录方式');
  }

  // 查找已有绑定
  const binding = await MongoOAuthBindingModel.findOne({
    provider,
    providerId
  }).lean();

  let isNewUser = false;
  let userId: string;

  if (binding) {
    // 已有绑定，更新登录时间和 profile
    await MongoOAuthBindingModel.updateOne(
      { _id: binding._id },
      { $set: { lastLoginTime: new Date(), profile } }
    );
    userId = binding.userId;

    // 更新用户最后登录时间
    await MongoUserModel.updateOne({ _id: userId }, { $set: { lastLoginTime: new Date() } });
  } else {
    // 新用户流程
    isNewUser = true;

    // 1. 先检查是否有相同邮箱的用户（用于账号关联）
    let existingUser = null;
    if (profile.email) {
      existingUser = await MongoUserModel.findOne({ email: profile.email }).lean();
    }

    if (existingUser) {
      // 已有账号，关联 OAuth
      userId = existingUser._id;
      isNewUser = false;
    } else {
      // 2. 创建新用户
      const newUser = await MongoUserModel.create({
        username: profile.nickname || `user_${Date.now()}`,
        avatar: profile.avatar,
        email: profile.email,
        status: 'active',
        lastLoginTime: new Date()
      });
      userId = newUser._id;
    }

    // 3. 创建 OAuth 绑定
    await MongoOAuthBindingModel.create({
      userId,
      provider,
      providerId,
      profile,
      bindTime: new Date(),
      lastLoginTime: new Date()
    });
  }

  // 获取完整用户信息
  const userDoc = await MongoUserModel.findById(userId).lean();
  if (!userDoc) {
    throw new Error('用户不存在');
  }

  // 生成 JWT Token
  const token = generateAccessToken({
    userId: String(userDoc._id)
  });

  const user: UserInfoType = {
    _id: String(userDoc._id),
    username: userDoc.username,
    avatar: userDoc.avatar,
    email: userDoc.email,
    phone: userDoc.phone,
    status: userDoc.status,
    createTime: userDoc.createTime.toISOString()
  };

  return {
    user,
    token,
    isNewUser
  };
}

export default NextAPI(handler);
