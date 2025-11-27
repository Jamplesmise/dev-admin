/**
 * 通知服务统一入口
 */

export { sendSmsCode, isValidPhone } from './smsService';
export { sendEmailCode, isValidEmail } from './emailService';

/**
 * 联系方式类型
 */
export type ContactType = 'phone' | 'email';

/**
 * 识别联系方式类型
 */
export function getContactType(contact: string): ContactType | null {
  // 先检查是否是手机号
  if (/^1[3-9]\d{9}$/.test(contact)) {
    return 'phone';
  }

  // 再检查是否是邮箱
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    return 'email';
  }

  return null;
}

/**
 * 发送验证码（自动识别类型）
 */
export async function sendVerificationCode(
  contact: string,
  code: string
): Promise<void> {
  const { sendSmsCode } = await import('./smsService');
  const { sendEmailCode } = await import('./emailService');

  const contactType = getContactType(contact);

  if (contactType === 'phone') {
    await sendSmsCode(contact, code);
  } else if (contactType === 'email') {
    await sendEmailCode(contact, code);
  } else {
    throw new Error('无效的联系方式');
  }
}
