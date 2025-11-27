/**
 * Phase 5A - 密码工具单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  checkPasswordStrength
} from '@fastgpt/service/support_user/auth/passwordUtils';

describe('Phase 5A - PasswordUtils', () => {
  describe('hashPassword', () => {
    it('应返回加密后的密码', () => {
      const hashed = hashPassword('Test1234');
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe('Test1234');
      expect(hashed).toContain(':'); // salt:hash 格式
    });

    it('相同密码每次加密结果应不同（随机盐）', () => {
      const hash1 = hashPassword('Test1234');
      const hash2 = hashPassword('Test1234');
      expect(hash1).not.toBe(hash2);
    });

    it('加密结果应包含 salt 和 hash 两部分', () => {
      const hashed = hashPassword('Test1234');
      const parts = hashed.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBe(32); // 16 bytes hex = 32 chars
      expect(parts[1].length).toBe(128); // 64 bytes hex = 128 chars
    });
  });

  describe('verifyPassword', () => {
    it('正确密码应验证通过', () => {
      const hashed = hashPassword('Test1234');
      const result = verifyPassword('Test1234', hashed);
      expect(result).toBe(true);
    });

    it('错误密码应验证失败', () => {
      const hashed = hashPassword('Test1234');
      const result = verifyPassword('Wrong1234', hashed);
      expect(result).toBe(false);
    });

    it('空密码应验证失败', () => {
      const hashed = hashPassword('Test1234');
      const result = verifyPassword('', hashed);
      expect(result).toBe(false);
    });

    it('无效存储格式应验证失败', () => {
      expect(verifyPassword('Test1234', 'invalid')).toBe(false);
      expect(verifyPassword('Test1234', '')).toBe(false);
      expect(verifyPassword('Test1234', 'no:separator:here:')).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('有效密码应通过', () => {
      expect(validatePasswordStrength('Test1234')).toBe(true);
      expect(validatePasswordStrength('Abc12345')).toBe(true);
      expect(validatePasswordStrength('Password1')).toBe(true);
      expect(validatePasswordStrength('a1234567')).toBe(true);
      expect(validatePasswordStrength('1234567a')).toBe(true);
    });

    it('太短的密码应失败', () => {
      expect(validatePasswordStrength('Test123')).toBe(false);
      expect(validatePasswordStrength('Ab1')).toBe(false);
      expect(validatePasswordStrength('1234567')).toBe(false);
    });

    it('纯数字密码应失败', () => {
      expect(validatePasswordStrength('12345678')).toBe(false);
      expect(validatePasswordStrength('123456789012')).toBe(false);
    });

    it('纯字母密码应失败', () => {
      expect(validatePasswordStrength('abcdefgh')).toBe(false);
      expect(validatePasswordStrength('ABCDEFGH')).toBe(false);
      expect(validatePasswordStrength('AbCdEfGh')).toBe(false);
    });

    it('空密码应失败', () => {
      expect(validatePasswordStrength('')).toBe(false);
    });

    it('null/undefined 应失败', () => {
      expect(validatePasswordStrength(null as any)).toBe(false);
      expect(validatePasswordStrength(undefined as any)).toBe(false);
    });
  });

  describe('checkPasswordStrength', () => {
    it('有效密码应返回 valid=true 且无错误', () => {
      const result = checkPasswordStrength('Test1234');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空密码应返回具体错误', () => {
      const result = checkPasswordStrength('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码不能为空');
    });

    it('太短密码应返回长度错误', () => {
      const result = checkPasswordStrength('Ab1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8'))).toBe(true);
    });

    it('纯数字应返回缺少字母错误', () => {
      const result = checkPasswordStrength('12345678');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('字母'))).toBe(true);
    });

    it('纯字母应返回缺少数字错误', () => {
      const result = checkPasswordStrength('abcdefgh');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('数字'))).toBe(true);
    });

    it('多个问题应返回多个错误', () => {
      const result = checkPasswordStrength('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
