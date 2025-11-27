/**
 * 发送验证码 API
 *
 * POST /api/support/user/inform/sendAuthCode
 *
 * 用于发送手机或邮箱验证码，支持注册、找回密码、绑定联系方式等场景
 */

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  VerificationCodeTypeEnum,
  VERIFICATION_CODE_CONFIG,
  type SendVerificationCodeRequest,
  type SendVerificationCodeResponse
} from '@fastgpt/global/support_user/auth/verificationCode';
import {
  checkRateLimit,
  saveVerificationCode,
  generateVerificationCode
} from '@fastgpt/service/support_user/auth/verificationCodeService';
import {
  sendVerificationCode,
  getContactType
} from '@fastgpt/service/support_user/notification';
import { MongoCaptchaSessionModel } from '@fastgpt/service/support_user/auth/schema';

// 不需要认证
const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<SendVerificationCodeRequest>,
  _res: NextApiResponse
): Promise<SendVerificationCodeResponse> {
  if (req.method !== 'POST') {
    throw new Error('Method not allowed');
  }

  const { type, contact, captchaId, captchaCode } = req.body;

  // 1. 参数验证
  if (!type || !Object.keys(VerificationCodeTypeEnum).includes(type)) {
    throw new Error('无效的验证码类型');
  }

  if (!contact) {
    throw new Error('请输入手机号或邮箱');
  }

  // 2. 验证联系方式格式
  const contactType = getContactType(contact);
  if (!contactType) {
    throw new Error('请输入有效的手机号或邮箱');
  }

  // 3. 验证图形验证码（如果提供）
  if (captchaId && captchaCode) {
    const captchaSession = await MongoCaptchaSessionModel.findOne({
      captchaId,
      expireAt: { $gt: new Date() }
    });

    if (!captchaSession) {
      throw new Error('图形验证码已过期，请刷新');
    }

    if (captchaSession.answer.toLowerCase() !== captchaCode.toLowerCase()) {
      throw new Error('图形验证码错误');
    }

    // 验证成功后删除
    await MongoCaptchaSessionModel.deleteOne({ captchaId });
  }

  // 4. 检查频率限制
  const rateLimitError = await checkRateLimit(contact);
  if (rateLimitError) {
    const error = new Error(rateLimitError) as any;
    error.statusCode = 429;
    throw error;
  }

  // 5. 生成验证码
  const code = generateVerificationCode();

  // 6. 保存验证码到 Redis
  await saveVerificationCode(type, contact, code);

  // 7. 发送验证码
  try {
    await sendVerificationCode(contact, code);
  } catch (sendError: any) {
    console.error('Send verification code failed:', sendError);
    throw new Error('验证码发送失败，请稍后重试');
  }

  return {
    success: true,
    expireTime: VERIFICATION_CODE_CONFIG.EXPIRE_SECONDS
  };
}

export default NextAPI(handler);
