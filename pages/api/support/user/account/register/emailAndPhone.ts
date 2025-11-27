/**
 * 用户注册 API
 *
 * POST /api/support/user/account/register/emailAndPhone
 *
 * 通过手机号或邮箱注册新用户
 */

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { createUserSession } from '@fastgpt/service/support_user/session';
import { verifyCode } from '@fastgpt/service/support_user/auth/verificationCodeService';
import {
  hashPassword,
  validatePasswordStrength
} from '@fastgpt/service/support_user/auth/passwordUtils';
import { getContactType } from '@fastgpt/service/support_user/notification';

// 请求类型
type RegisterRequest = {
  username: string;
  password: string;
  contact: string;
  code: string;
  inviterId?: string;
};

// 响应类型
type RegisterResponse = {
  user: {
    _id: string;
    username: string;
    avatar: string;
  };
  token: string;
};

// 不需要认证
const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<RegisterRequest>,
  _res: NextApiResponse
): Promise<RegisterResponse> {
  if (req.method !== 'POST') {
    throw new Error('Method not allowed');
  }

  const { username, password, contact, code, inviterId } = req.body;

  // 1. 参数验证
  if (!username || username.length < 2 || username.length > 50) {
    throw new Error('用户名长度必须在 2-50 个字符之间');
  }

  if (!password) {
    throw new Error('请输入密码');
  }

  if (!validatePasswordStrength(password)) {
    throw new Error('密码至少 8 位，且必须包含字母和数字');
  }

  if (!contact) {
    throw new Error('请输入手机号或邮箱');
  }

  if (!code) {
    throw new Error('请输入验证码');
  }

  // 2. 验证联系方式格式
  const contactType = getContactType(contact);
  if (!contactType) {
    throw new Error('请输入有效的手机号或邮箱');
  }

  // 3. 验证验证码
  const codeValid = await verifyCode('register', contact, code);
  if (!codeValid) {
    throw new Error('验证码错误或已过期');
  }

  // 4. 检查用户是否已存在
  const existingQuery =
    contactType === 'phone' ? { phone: contact } : { email: contact.toLowerCase() };

  const existingUser = await MongoUserModel.findOne(existingQuery);
  if (existingUser) {
    throw new Error(contactType === 'phone' ? '该手机号已注册' : '该邮箱已注册');
  }

  // 检查用户名是否已存在
  const existingUsername = await MongoUserModel.findOne({ username });
  if (existingUsername) {
    throw new Error('该用户名已被使用');
  }

  // 6. 创建用户
  const hashedPassword = hashPassword(password);

  const userData: any = {
    username,
    password: hashedPassword,
    status: 'active'
  };

  if (contactType === 'phone') {
    userData.phone = contact;
  } else {
    userData.email = contact.toLowerCase();
  }

  const newUser = await MongoUserModel.create(userData);

  // 7. 创建默认团队
  // TODO: 实现团队创建逻辑
  // 临时：使用用户 ID 作为团队 ID 和 tmbId
  const teamId = newUser._id.toString();
  const tmbId = newUser._id.toString();

  // 8. 处理邀请关系（如果有）
  if (inviterId) {
    // TODO: 记录邀请关系
    console.log(`User ${newUser._id} was invited by ${inviterId}`);
  }

  // 9. 创建用户会话
  const ip = req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress;
  const sessionKey = await createUserSession({
    userId: newUser._id.toString(),
    teamId,
    tmbId,
    ip
  });

  // 10. 设置 Cookie
  _res.setHeader(
    'Set-Cookie',
    `fastgpt_token=${sessionKey}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
  );

  return {
    user: {
      _id: newUser._id.toString(),
      username: newUser.username,
      avatar: newUser.avatar || ''
    },
    token: sessionKey
  };
}

export default NextAPI(handler);
