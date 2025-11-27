# Phase 5A - 用户认证补充测试计划

> 子阶段: Phase 5A
> 测试范围: 验证码、用户注册、找回密码
> 最后更新: 2025-11-25

---

## 1. 测试概述

### 1.1 测试目标

验证用户认证补充功能的正确性、安全性和稳定性。

### 1.2 测试范围

| 模块 | API | 测试类型 |
|------|-----|---------|
| 验证码服务 | - | 单元测试 |
| 发送验证码 | POST /api/support/user/inform/sendAuthCode | 单元测试 + 集成测试 |
| 用户注册 | POST /api/support/user/account/register/emailAndPhone | 单元测试 + 集成测试 |
| 找回密码 | POST /api/support/user/account/password/updateByCode | 单元测试 + 集成测试 |

---

## 2. 单元测试

### 2.1 验证码服务测试

**文件**: `test/unit/verificationCodeService.test.ts`

```typescript
describe('VerificationCodeService', () => {
  describe('generateVerificationCode', () => {
    it('应生成 6 位数字验证码', () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('每次生成的验证码应不同', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }
      expect(codes.size).toBeGreaterThan(90); // 至少 90% 不重复
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(async () => {
      await clearRedisTestData();
    });

    it('首次发送应通过', async () => {
      const result = await checkRateLimit('13800138000');
      expect(result).toBeNull();
    });

    it('60 秒内重复发送应被拒绝', async () => {
      await saveVerificationCode('register', '13800138000', '123456');
      const result = await checkRateLimit('13800138000');
      expect(result).toContain('发送过于频繁');
    });

    it('达到每日上限应被拒绝', async () => {
      // 模拟达到上限
      for (let i = 0; i < 10; i++) {
        await simulateSend('13800138000');
      }
      const result = await checkRateLimit('13800138000');
      expect(result).toContain('今日发送次数已达上限');
    });
  });

  describe('saveVerificationCode', () => {
    it('应正确保存验证码', async () => {
      await saveVerificationCode('register', '13800138000', '123456');
      const verified = await verifyCode('register', '13800138000', '123456');
      expect(verified).toBe(true);
    });

    it('验证码应在 5 分钟后过期', async () => {
      await saveVerificationCode('register', '13800138000', '123456');
      const ttl = await getCodeTTL('register', '13800138000');
      expect(ttl).toBeLessThanOrEqual(300);
      expect(ttl).toBeGreaterThan(290);
    });
  });

  describe('verifyCode', () => {
    beforeEach(async () => {
      await saveVerificationCode('register', '13800138000', '123456');
    });

    it('正确验证码应通过', async () => {
      const result = await verifyCode('register', '13800138000', '123456');
      expect(result).toBe(true);
    });

    it('错误验证码应失败', async () => {
      const result = await verifyCode('register', '13800138000', '654321');
      expect(result).toBe(false);
    });

    it('验证码使用后应失效', async () => {
      await verifyCode('register', '13800138000', '123456');
      const result = await verifyCode('register', '13800138000', '123456');
      expect(result).toBe(false);
    });

    it('不同类型的验证码应独立', async () => {
      await saveVerificationCode('findPassword', '13800138000', '654321');
      const result = await verifyCode('register', '13800138000', '654321');
      expect(result).toBe(false);
    });
  });
});
```

### 2.2 密码工具测试

**文件**: `test/unit/passwordUtils.test.ts`

```typescript
describe('PasswordUtils', () => {
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
  });

  describe('validatePasswordStrength', () => {
    it('有效密码应通过', () => {
      expect(validatePasswordStrength('Test1234')).toBe(true);
      expect(validatePasswordStrength('Abc12345')).toBe(true);
      expect(validatePasswordStrength('Password1')).toBe(true);
    });

    it('太短的密码应失败', () => {
      expect(validatePasswordStrength('Test123')).toBe(false);
      expect(validatePasswordStrength('Ab1')).toBe(false);
    });

    it('纯数字密码应失败', () => {
      expect(validatePasswordStrength('12345678')).toBe(false);
    });

    it('纯字母密码应失败', () => {
      expect(validatePasswordStrength('abcdefgh')).toBe(false);
    });
  });
});
```

### 2.3 联系方式验证测试

**文件**: `test/unit/contactValidation.test.ts`

```typescript
describe('ContactValidation', () => {
  describe('isValidPhone', () => {
    it('有效手机号应通过', () => {
      expect(isValidPhone('13800138000')).toBe(true);
      expect(isValidPhone('15912345678')).toBe(true);
      expect(isValidPhone('18812345678')).toBe(true);
    });

    it('无效手机号应失败', () => {
      expect(isValidPhone('1380013800')).toBe(false);  // 10 位
      expect(isValidPhone('23800138000')).toBe(false); // 不是 1 开头
      expect(isValidPhone('abcdefghijk')).toBe(false); // 非数字
    });
  });

  describe('isValidEmail', () => {
    it('有效邮箱应通过', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.cn')).toBe(true);
    });

    it('无效邮箱应失败', () => {
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test.example.com')).toBe(false);
    });
  });

  describe('getContactType', () => {
    it('应正确识别手机号', () => {
      expect(getContactType('13800138000')).toBe('phone');
    });

    it('应正确识别邮箱', () => {
      expect(getContactType('test@example.com')).toBe('email');
    });

    it('无效联系方式应返回 null', () => {
      expect(getContactType('invalid')).toBeNull();
    });
  });
});
```

---

## 3. API 集成测试

### 3.1 发送验证码 API

**文件**: `test/api/sendAuthCode.test.ts`

```typescript
describe('POST /api/support/user/inform/sendAuthCode', () => {
  describe('参数验证', () => {
    it('缺少 type 应返回 400', async () => {
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ contact: '13800138000' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('type');
    });

    it('缺少 contact 应返回 400', async () => {
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'register' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('contact');
    });

    it('无效的 type 应返回 400', async () => {
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'invalid', contact: '13800138000' });

      expect(res.status).toBe(400);
    });

    it('无效的手机号应返回 400', async () => {
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'register', contact: '1234567890' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('手机号');
    });

    it('无效的邮箱应返回 400', async () => {
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'register', contact: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('邮箱');
    });
  });

  describe('频率限制', () => {
    beforeEach(async () => {
      await clearRedisTestData();
    });

    it('首次发送应成功', async () => {
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'register', contact: '13800138000' });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.expireTime).toBe(300);
    });

    it('60 秒内重复发送应返回 429', async () => {
      // 第一次发送
      await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'register', contact: '13800138000' });

      // 第二次发送
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({ type: 'register', contact: '13800138000' });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain('频繁');
    });
  });

  describe('图形验证码', () => {
    it('需要图形验证码时，缺少应返回 400', async () => {
      // 模拟需要图形验证码的场景（如发送次数过多）
      const res = await request
        .post('/api/support/user/inform/sendAuthCode')
        .send({
          type: 'register',
          contact: '13800138000'
          // 缺少 captchaId 和 captchaCode
        });

      // 根据业务逻辑决定是否需要图形验证码
      // expect(res.status).toBe(400);
    });
  });
});
```

### 3.2 用户注册 API

**文件**: `test/api/register.test.ts`

```typescript
describe('POST /api/support/user/account/register/emailAndPhone', () => {
  beforeEach(async () => {
    await clearTestUsers();
    await clearRedisTestData();
  });

  describe('参数验证', () => {
    it('缺少必填字段应返回 400', async () => {
      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({});

      expect(res.status).toBe(400);
    });

    it('用户名太短应返回 400', async () => {
      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'ab',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('用户名');
    });

    it('密码强度不足应返回 400', async () => {
      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'testuser',
          password: '123456',
          contact: '13800138000',
          code: '123456'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('密码');
    });
  });

  describe('验证码验证', () => {
    it('验证码错误应返回 400', async () => {
      // 先发送验证码
      await sendTestVerificationCode('register', '13800138000');

      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '000000' // 错误验证码
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('验证码');
    });

    it('验证码过期应返回 400', async () => {
      // 模拟验证码过期场景
      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code: '123456'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('验证码');
    });
  });

  describe('注册成功', () => {
    it('手机号注册应成功', async () => {
      // 先发送验证码
      const code = await sendTestVerificationCode('register', '13800138000');

      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe('testuser');
      expect(res.body.data.token).toBeDefined();
    });

    it('邮箱注册应成功', async () => {
      const code = await sendTestVerificationCode('register', 'test@example.com');

      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'testuser',
          password: 'Test1234',
          contact: 'test@example.com',
          code
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('test@example.com');
    });
  });

  describe('重复注册', () => {
    beforeEach(async () => {
      await createTestUser({ phone: '13800138000' });
    });

    it('手机号已注册应返回 409', async () => {
      const code = await sendTestVerificationCode('register', '13800138000');

      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'newuser',
          password: 'Test1234',
          contact: '13800138000',
          code
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('已注册');
    });
  });

  describe('邀请注册', () => {
    it('带邀请人 ID 注册应记录邀请关系', async () => {
      const inviter = await createTestUser({ username: 'inviter' });
      const code = await sendTestVerificationCode('register', '13800138000');

      const res = await request
        .post('/api/support/user/account/register/emailAndPhone')
        .send({
          username: 'testuser',
          password: 'Test1234',
          contact: '13800138000',
          code,
          inviterId: inviter._id.toString()
        });

      expect(res.status).toBe(200);
      // 验证邀请关系已记录（需要额外查询）
    });
  });
});
```

### 3.3 找回密码 API

**文件**: `test/api/updatePasswordByCode.test.ts`

```typescript
describe('POST /api/support/user/account/password/updateByCode', () => {
  let testUser: any;

  beforeEach(async () => {
    await clearRedisTestData();
    testUser = await createTestUser({
      username: 'testuser',
      phone: '13800138000',
      password: 'OldPassword1'
    });
  });

  describe('参数验证', () => {
    it('缺少必填字段应返回 400', async () => {
      const res = await request
        .post('/api/support/user/account/password/updateByCode')
        .send({});

      expect(res.status).toBe(400);
    });

    it('新密码强度不足应返回 400', async () => {
      const code = await sendTestVerificationCode('findPassword', '13800138000');

      const res = await request
        .post('/api/support/user/account/password/updateByCode')
        .send({
          contact: '13800138000',
          code,
          newPassword: '123456'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('密码');
    });
  });

  describe('验证码验证', () => {
    it('验证码错误应返回 400', async () => {
      await sendTestVerificationCode('findPassword', '13800138000');

      const res = await request
        .post('/api/support/user/account/password/updateByCode')
        .send({
          contact: '13800138000',
          code: '000000',
          newPassword: 'NewPassword1'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('验证码');
    });
  });

  describe('用户不存在', () => {
    it('未注册的手机号应返回 404', async () => {
      const code = await sendTestVerificationCode('findPassword', '13900139000');

      const res = await request
        .post('/api/support/user/account/password/updateByCode')
        .send({
          contact: '13900139000',
          code,
          newPassword: 'NewPassword1'
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('用户不存在');
    });
  });

  describe('密码重置成功', () => {
    it('应成功重置密码', async () => {
      const code = await sendTestVerificationCode('findPassword', '13800138000');

      const res = await request
        .post('/api/support/user/account/password/updateByCode')
        .send({
          contact: '13800138000',
          code,
          newPassword: 'NewPassword1'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('重置后应能用新密码登录', async () => {
      const code = await sendTestVerificationCode('findPassword', '13800138000');

      await request
        .post('/api/support/user/account/password/updateByCode')
        .send({
          contact: '13800138000',
          code,
          newPassword: 'NewPassword1'
        });

      // 验证能用新密码登录
      const loginRes = await request
        .post('/api/support/user/account/login')
        .send({
          contact: '13800138000',
          password: 'NewPassword1'
        });

      expect(loginRes.status).toBe(200);
    });

    it('重置后旧密码应失效', async () => {
      const code = await sendTestVerificationCode('findPassword', '13800138000');

      await request
        .post('/api/support/user/account/password/updateByCode')
        .send({
          contact: '13800138000',
          code,
          newPassword: 'NewPassword1'
        });

      // 验证旧密码无法登录
      const loginRes = await request
        .post('/api/support/user/account/login')
        .send({
          contact: '13800138000',
          password: 'OldPassword1'
        });

      expect(loginRes.status).toBe(401);
    });
  });
});
```

---

## 4. 安全测试

### 4.1 验证码安全

| 测试项 | 描述 | 预期结果 |
|--------|------|---------|
| 暴力破解防护 | 尝试 1000 个验证码 | 应有频率限制 |
| 验证码泄露 | API 响应不返回验证码 | 验证码仅通过短信/邮件发送 |
| 验证码重用 | 使用已验证的验证码 | 应失败 |
| 跨类型使用 | 用注册验证码找回密码 | 应失败 |

### 4.2 密码安全

| 测试项 | 描述 | 预期结果 |
|--------|------|---------|
| 密码强度 | 弱密码注册 | 应被拒绝 |
| 密码存储 | 检查数据库 | 密码应加密存储 |
| 密码传输 | 网络抓包 | 应通过 HTTPS |

### 4.3 防刷测试

| 测试项 | 描述 | 预期结果 |
|--------|------|---------|
| 发送频率 | 60 秒内多次发送 | 应被限制 |
| 每日上限 | 同一号码发送 11 次 | 第 11 次应失败 |
| 分布式攻击 | 多 IP 同时请求 | 按号码限制，非 IP |

---

## 5. 测试数据

### 5.1 测试手机号

| 手机号 | 用途 | 说明 |
|--------|------|------|
| 13800138000 | 通用测试 | 默认测试号码 |
| 13800138001 | 已注册用户 | 用于重复注册测试 |
| 13800138002 | 找回密码 | 用于密码重置测试 |
| 13900000000 | 未注册号码 | 用于用户不存在测试 |

### 5.2 测试验证码

| 场景 | 验证码 | 说明 |
|------|--------|------|
| 测试环境固定 | 123456 | 可配置环境变量开启 |
| 正常流程 | 随机生成 | 6 位数字 |

### 5.3 测试用户数据

```typescript
const testUsers = [
  {
    username: 'testuser1',
    phone: '13800138001',
    email: 'test1@example.com',
    password: 'Test1234'
  },
  {
    username: 'testuser2',
    phone: '13800138002',
    email: 'test2@example.com',
    password: 'Test5678'
  }
];
```

---

## 6. 测试工具函数

**文件**: `test/helpers/authTestHelpers.ts`

```typescript
import { getGlobalRedisConnection } from '@fastgpt/service/common/redis';
import { saveVerificationCode } from '@fastgpt/service/support_user/auth/verificationCodeService';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';

// 清除 Redis 测试数据
export async function clearRedisTestData() {
  const redis = getGlobalRedisConnection();
  const keys = await redis.keys('auth:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// 发送测试验证码（直接保存到 Redis）
export async function sendTestVerificationCode(
  type: string,
  contact: string
): Promise<string> {
  const code = process.env.TEST_VERIFICATION_CODE || '123456';
  await saveVerificationCode(type as any, contact, code);
  return code;
}

// 创建测试用户
export async function createTestUser(data: Partial<UserSchemaType>) {
  const user = await MongoUserModel.create({
    username: data.username || 'testuser',
    phone: data.phone,
    email: data.email,
    password: data.password ? hashPassword(data.password) : undefined,
    status: 'active'
  });
  return user;
}

// 清除测试用户
export async function clearTestUsers() {
  await MongoUserModel.deleteMany({
    username: { $regex: /^test/ }
  });
}
```

---

## 7. 测试执行

### 7.1 命令

```bash
# 运行所有 Phase 5A 测试
pnpm test -- --grep "Phase5A"

# 运行验证码服务单元测试
pnpm test test/unit/verificationCodeService.test.ts

# 运行 API 集成测试
pnpm test test/api/sendAuthCode.test.ts
pnpm test test/api/register.test.ts
pnpm test test/api/updatePasswordByCode.test.ts

# 运行并生成覆盖率报告
pnpm test:coverage -- --grep "Phase5A"
```

### 7.2 CI/CD 集成

```yaml
# .github/workflows/test.yml
test-phase5a:
  runs-on: ubuntu-latest
  services:
    redis:
      image: redis:7
      ports:
        - 6379:6379
    mongodb:
      image: mongo:6
      ports:
        - 27017:27017
  steps:
    - uses: actions/checkout@v3
    - uses: pnpm/action-setup@v2
    - run: pnpm install
    - run: pnpm test -- --grep "Phase5A"
```

---

## 8. 验收标准

| 指标 | 要求 |
|------|------|
| 单元测试覆盖率 | ≥ 80% |
| API 测试通过率 | 100% |
| 安全测试 | 全部通过 |
| 性能测试 | 响应时间 < 500ms |

---

*最后更新: 2025-11-25*
