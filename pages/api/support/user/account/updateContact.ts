import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type {
  UpdateContactRequest,
  UpdateContactResponse
} from '@fastgpt/global/support_user/auth/type';

const NextAPI = NextEntry({ beforeCallback: [] });

// 验证手机号格式
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 模拟验证码验证
// TODO: 实际应该从 Redis 验证
async function verifyCode(_contact: string, code: string): Promise<boolean> {
  // 开发环境允许使用测试验证码
  if (process.env.NODE_ENV === 'development' && code === '123456') {
    return true;
  }
  // TODO: 从 Redis 获取并验证验证码
  return false;
}

async function handler(
  req: ApiRequestProps<UpdateContactRequest>,
  _res: NextApiResponse
): Promise<UpdateContactResponse> {
  const { userId } = req.auth;
  const { phone, email, verifyCode: code } = req.body;

  if (!phone && !email) {
    return Promise.reject('请提供手机号或邮箱');
  }

  if (!code) {
    return Promise.reject('请输入验证码');
  }

  // 验证格式
  if (phone && !isValidPhone(phone)) {
    return Promise.reject('手机号格式不正确');
  }

  if (email && !isValidEmail(email)) {
    return Promise.reject('邮箱格式不正确');
  }

  // 验证验证码
  const contact = phone || email || '';
  const isValid = await verifyCode(contact, code);

  if (!isValid) {
    return Promise.reject('验证码错误或已过期');
  }

  // TODO: 更新用户联系方式
  // await MongoUserModel.updateOne(
  //   { _id: userId },
  //   { $set: phone ? { phone } : { email } }
  // );

  console.log(`用户 ${userId} 更新联系方式: ${phone || email}`);

  return {
    success: true
  };
}

export default NextAPI(handler);
