import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type {
  FastLoginRequest,
  FastLoginResponse,
  UserInfoType
} from '@fastgpt/global/support_user/auth/type';
import { nanoid } from 'nanoid';

const NextAPI = NextEntry({ beforeCallback: [] });

// 模拟验证一次性 token
// TODO: 实际应该从 Redis 或数据库验证
async function validateOneTimeToken(token: string): Promise<{ userId: string; username: string } | null> {
  // 模拟验证逻辑
  if (token && token.startsWith('fastlogin_')) {
    return {
      userId: token.replace('fastlogin_', ''),
      username: 'FastLogin User'
    };
  }
  return null;
}

async function handler(
  req: ApiRequestProps<FastLoginRequest>,
  _res: NextApiResponse
): Promise<FastLoginResponse> {
  const { token } = req.body;

  if (!token) {
    return Promise.reject('缺少登录凭证');
  }

  // 验证一次性 token
  const tokenData = await validateOneTimeToken(token);

  if (!tokenData) {
    return Promise.reject('登录凭证无效或已过期');
  }

  // 生成新的会话 token
  const sessionToken = `token_${nanoid(32)}`;

  const user: UserInfoType = {
    _id: tokenData.userId,
    username: tokenData.username,
    status: 'active',
    createTime: new Date().toISOString()
  };

  return {
    user,
    token: sessionToken
  };
}

export default NextAPI(handler);
