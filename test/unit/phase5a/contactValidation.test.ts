/**
 * Phase 5A - 联系方式验证单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  getContactType,
  isValidPhone,
  isValidEmail
} from '@fastgpt/service/support_user/notification';

describe('Phase 5A - ContactValidation', () => {
  describe('isValidPhone', () => {
    it('有效中国手机号应通过', () => {
      expect(isValidPhone('13800138000')).toBe(true);
      expect(isValidPhone('15912345678')).toBe(true);
      expect(isValidPhone('18812345678')).toBe(true);
      expect(isValidPhone('17012345678')).toBe(true);
      expect(isValidPhone('19912345678')).toBe(true);
    });

    it('10 位号码应失败', () => {
      expect(isValidPhone('1380013800')).toBe(false);
    });

    it('12 位号码应失败', () => {
      expect(isValidPhone('138001380000')).toBe(false);
    });

    it('不是 1 开头应失败', () => {
      expect(isValidPhone('23800138000')).toBe(false);
      expect(isValidPhone('03800138000')).toBe(false);
    });

    it('第二位不是 3-9 应失败', () => {
      expect(isValidPhone('10800138000')).toBe(false);
      expect(isValidPhone('12800138000')).toBe(false);
    });

    it('包含非数字字符应失败', () => {
      expect(isValidPhone('1380013800a')).toBe(false);
      expect(isValidPhone('138-0013-8000')).toBe(false);
      expect(isValidPhone('138 0013 8000')).toBe(false);
    });

    it('空字符串应失败', () => {
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('有效邮箱应通过', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.cn')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
      expect(isValidEmail('a@b.co')).toBe(true);
    });

    it('缺少 @ 应失败', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
    });

    it('缺少域名应失败', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('缺少用户名应失败', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('缺少顶级域名应失败', () => {
      expect(isValidEmail('test@example')).toBe(false);
    });

    it('包含空格应失败', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
      expect(isValidEmail('test@ example.com')).toBe(false);
    });

    it('空字符串应失败', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('getContactType', () => {
    it('应正确识别手机号', () => {
      expect(getContactType('13800138000')).toBe('phone');
      expect(getContactType('15912345678')).toBe('phone');
    });

    it('应正确识别邮箱', () => {
      expect(getContactType('test@example.com')).toBe('email');
      expect(getContactType('user@domain.cn')).toBe('email');
    });

    it('无效联系方式应返回 null', () => {
      expect(getContactType('invalid')).toBeNull();
      expect(getContactType('12345')).toBeNull();
      expect(getContactType('')).toBeNull();
      expect(getContactType('test@')).toBeNull();
    });

    it('手机号格式优先于邮箱格式', () => {
      // 11 位数字优先判定为手机号
      expect(getContactType('13800138000')).toBe('phone');
    });
  });
});
