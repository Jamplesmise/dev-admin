/**
 * 找回密码（通过验证码重置）API
 *
 * POST /api/support/user/account/password/updateByCode
 *
 * 通过手机号或邮箱验证码重置密码
 */

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { delUserAllSession } from '@fastgpt/service/support_user/session';
import { verifyCode } from '@fastgpt/service/support_user/auth/verificationCodeService';
import {
  hashPassword,
  validatePasswordStrength
} from '@fastgpt/service/support_user/auth/passwordUtils';
import { getContactType } from '@fastgpt/service/support_user/notification';

// 请求类型
type UpdatePasswordByCodeRequest = {
  contact: string;
  code: string;
  newPassword: string;
};

// 响应类型
type UpdatePasswordByCodeResponse = {
  success: true;
};

// 不需要认证
const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<UpdatePasswordByCodeRequest>,
  _res: NextApiResponse
): Promise<UpdatePasswordByCodeResponse> {
  if (req.method !== 'POST') {
    throw new Error('Method not allowed');
  }

  const { contact, code, newPassword } = req.body;

  // 1. 参数验证
  if (!contact) {
    throw new Error('请输入手机号或邮箱');
  }

  if (!code) {
    throw new Error('请输入验证码');
  }

  if (!newPassword) {
    throw new Error('请输入新密码');
  }

  // 2. 验证联系方式格式
  const contactType = getContactType(contact);
  if (!contactType) {
    throw new Error('请输入有效的手机号或邮箱');
  }

  // 3. 验证密码强度
  if (!validatePasswordStrength(newPassword)) {
    throw new Error('密码至少 8 位，且必须包含字母和数字');
  }

  // 4. 验证验证码
  const codeValid = await verifyCode('findPassword', contact, code);
  if (!codeValid) {
    throw new Error('验证码错误或已过期');
  }

  // 5. 查找用户
  const query =
    contactType === 'phone' ? { phone: contact } : { email: contact.toLowerCase() };

  const user = await MongoUserModel.findOne(query);
  if (!user) {
    const error = new Error('用户不存在') as any;
    error.statusCode = 404;
    throw error;
  }

  // 7. 更新密码
  const hashedPassword = hashPassword(newPassword);

  await MongoUserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        updateTime: new Date()
      }
    }
  );

  // 8. 清除所有现有会话（强制重新登录）
  try {
    await delUserAllSession(user._id.toString());
  } catch (error) {
    // 清除会话失败不影响密码重置
    console.error('Clear user sessions failed:', error);
  }

  return {
    success: true
  };
}

export default NextAPI(handler);
