/**
 * 密码工具函数
 */

import crypto from 'crypto';

/**
 * 密码强度验证
 * 要求：至少 8 位，包含字母和数字
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || password.length < 8) {
    return false;
  }

  // 必须包含字母
  const hasLetter = /[A-Za-z]/.test(password);
  // 必须包含数字
  const hasNumber = /\d/.test(password);

  return hasLetter && hasNumber;
}

/**
 * 密码加密
 * 使用 PBKDF2 算法，随机盐
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(':');

  if (!salt || !originalHash) {
    return false;
  }

  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * 密码强度检查（返回详细信息）
 */
export function checkPasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push('密码不能为空');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('密码长度至少 8 位');
  }

  if (!/[A-Za-z]/.test(password)) {
    errors.push('密码必须包含字母');
  }

  if (!/\d/.test(password)) {
    errors.push('密码必须包含数字');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
