# Phase 5A - 用户认证补充功能规划

> 子阶段: Phase 5A
> 优先级: P0
> 接口数量: 3 个
> 最后更新: 2025-11-25
> **状态: ✅ 已完成**

---

## 1. 模块概述

补充用户认证流程中缺失的核心功能：验证码发送、用户注册、密码找回。

### 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| OAuth 登录 | ✅ 已实现 | GitHub/Google |
| 微信扫码登录 | ✅ 已实现 | 二维码+状态检查 |
| SSO 单点登录 | ⚠️ 部分实现 | 框架存在，验证逻辑模拟 |
| 验证码发送 | ✅ 已完成 | 2025-11-25 |
| 用户注册 | ✅ 已完成 | 2025-11-25 |
| 密码找回 | ✅ 已完成 | 2025-11-25 |
| 图形验证码 | ✅ 已实现 | 完整 |

---

## 2. API 规范

### 2.1 发送验证码

**端点**: `POST /api/support/user/inform/sendAuthCode`

**功能**: 发送手机/邮箱验证码，用于注册、找回密码、绑定联系方式

**请求**:
```typescript
type SendAuthCodeRequest = {
  type: 'register' | 'findPassword' | 'bindPhone' | 'bindEmail';
  contact: string;        // 手机号或邮箱
  captchaId?: string;     // 图形验证码 ID（防刷）
  captchaCode?: string;   // 图形验证码答案
};
```

**响应**:
```typescript
type SendAuthCodeResponse = {
  success: true;
  expireTime: number;     // 验证码有效期（秒）
};
```

**业务逻辑**:
1. 验证图形验证码（如果提供）
2. 检查发送频率限制（同一号码 60 秒内只能发一次）
3. 检查日发送上限（同一号码每天最多 10 次）
4. 生成 6 位数字验证码
5. 存储到 Redis（5 分钟过期）
6. 调用短信/邮件服务发送
7. 记录发送日志

**错误码**:
| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 429 | 发送过于频繁 |
| 500 | 发送失败 |

---

### 2.2 用户注册

**端点**: `POST /api/support/user/account/register/emailAndPhone`

**功能**: 通过邮箱或手机号注册新用户

**请求**:
```typescript
type RegisterRequest = {
  username: string;       // 用户名
  password: string;       // 密码（前端加密传输）
  contact: string;        // 手机号或邮箱
  code: string;           // 验证码
  inviterId?: string;     // 邀请人 ID
};
```

**响应**:
```typescript
type RegisterResponse = {
  user: {
    _id: string;
    username: string;
    avatar: string;
  };
  token: string;          // 登录 Token
};
```

**业务逻辑**:
1. 验证验证码是否正确且未过期
2. 检查用户名是否已存在
3. 检查手机号/邮箱是否已注册
4. 密码强度校验（至少 8 位，包含数字和字母）
5. 创建用户记录
6. 创建默认团队
7. 处理邀请关系（如有）
8. 生成登录 Token
9. 记录注册日志

**错误码**:
| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 409 | 用户名/手机号/邮箱已存在 |
| 410 | 验证码错误或过期 |

---

### 2.3 找回密码

**端点**: `POST /api/support/user/account/password/updateByCode`

**功能**: 通过验证码重置密码

**请求**:
```typescript
type UpdatePasswordByCodeRequest = {
  contact: string;        // 手机号或邮箱
  code: string;           // 验证码
  newPassword: string;    // 新密码
};
```

**响应**:
```typescript
type UpdatePasswordByCodeResponse = {
  success: true;
};
```

**业务逻辑**:
1. 验证验证码是否正确且未过期
2. 查找对应用户
3. 密码强度校验
4. 更新用户密码（加密存储）
5. 清除所有现有 Token（强制重新登录）
6. 删除已使用的验证码
7. 记录密码修改日志

---

## 3. 依赖服务

### 3.1 短信服务

**推荐方案**: 阿里云短信 / 腾讯云短信

**环境变量**:
```bash
# 阿里云短信
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=FastGPT
SMS_TEMPLATE_CODE=SMS_123456789

# 或腾讯云短信
SMS_SECRET_ID=
SMS_SECRET_KEY=
SMS_SDK_APP_ID=
SMS_SIGN_NAME=FastGPT
SMS_TEMPLATE_ID=123456
```

### 3.2 邮件服务

**推荐方案**: SMTP / SendGrid / 阿里云邮件

**环境变量**:
```bash
# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASS=password
SMTP_FROM=FastGPT <noreply@example.com>
```

### 3.3 Redis 存储

**Key 设计**:
```
# 验证码存储
auth:code:{type}:{contact} = {code}  TTL: 300s

# 发送频率限制
auth:rate:{contact} = 1              TTL: 60s

# 日发送计数
auth:daily:{contact}:{date} = count  TTL: 86400s
```

---

## 4. 安全措施

### 4.1 防刷机制

```typescript
// 发送验证码前检查
async function checkRateLimit(contact: string): Promise<void> {
  const redis = getRedis();

  // 1. 60 秒内不能重复发送
  const rateKey = `auth:rate:${contact}`;
  if (await redis.exists(rateKey)) {
    throw new Error('发送过于频繁，请稍后再试');
  }

  // 2. 每天最多发送 10 次
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `auth:daily:${contact}:${today}`;
  const count = await redis.incr(dailyKey);

  if (count === 1) {
    await redis.expire(dailyKey, 86400);
  }

  if (count > 10) {
    throw new Error('今日发送次数已达上限');
  }

  // 设置频率限制
  await redis.setex(rateKey, 60, '1');
}
```

### 4.2 验证码存储

```typescript
// 存储验证码
async function saveAuthCode(
  type: string,
  contact: string,
  code: string
): Promise<void> {
  const redis = getRedis();
  const key = `auth:code:${type}:${contact}`;

  // 存储验证码，5 分钟过期
  await redis.setex(key, 300, code);
}

// 验证并删除验证码
async function verifyAuthCode(
  type: string,
  contact: string,
  code: string
): Promise<boolean> {
  const redis = getRedis();
  const key = `auth:code:${type}:${contact}`;

  const storedCode = await redis.get(key);

  if (!storedCode || storedCode !== code) {
    return false;
  }

  // 验证成功后删除，防止重复使用
  await redis.del(key);
  return true;
}
```

### 4.3 密码安全

```typescript
import crypto from 'crypto';

// 密码加密
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 密码验证
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// 密码强度校验
function validatePasswordStrength(password: string): boolean {
  // 至少 8 位，包含数字和字母
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return regex.test(password);
}
```

---

## 5. 实现任务

### 5.1 新建文件

```
pages/api/support/user/
├── inform/
│   └── sendAuthCode.ts              # 发送验证码
└── account/
    ├── register/
    │   └── emailAndPhone.ts         # 用户注册
    └── password/
        └── updateByCode.ts          # 找回密码

src/packages/service/support_user/
├── auth/
│   └── codeService.ts               # 验证码服务
└── sms/
    └── index.ts                     # 短信服务封装
```

### 5.2 开发清单

- [x] 创建验证码存储服务（Redis）✅
- [x] 集成短信发送服务 ✅
- [x] 集成邮件发送服务 ✅
- [x] 实现发送验证码 API ✅
- [x] 实现用户注册 API ✅
- [x] 实现找回密码 API ✅
- [x] 添加频率限制中间件 ✅
- [x] 编写单元测试 ✅ (110 个测试全部通过)

---

## 6. 测试用例

### 6.1 发送验证码

```typescript
describe('POST /api/support/user/inform/sendAuthCode', () => {
  it('should send code to valid phone', async () => {
    const res = await request.post('/api/support/user/inform/sendAuthCode')
      .send({ type: 'register', contact: '13800138000' });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });

  it('should reject duplicate send within 60s', async () => {
    // 第一次发送
    await request.post('/api/support/user/inform/sendAuthCode')
      .send({ type: 'register', contact: '13800138000' });

    // 60秒内再次发送
    const res = await request.post('/api/support/user/inform/sendAuthCode')
      .send({ type: 'register', contact: '13800138000' });

    expect(res.status).toBe(429);
  });
});
```

### 6.2 用户注册

```typescript
describe('POST /api/support/user/account/register/emailAndPhone', () => {
  it('should register new user', async () => {
    // 先发送验证码
    await sendTestCode('13800138000');

    const res = await request.post('/api/support/user/account/register/emailAndPhone')
      .send({
        username: 'testuser',
        password: 'Test1234',
        contact: '13800138000',
        code: '123456' // 测试环境固定验证码
      });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject weak password', async () => {
    const res = await request.post('/api/support/user/account/register/emailAndPhone')
      .send({
        username: 'testuser',
        password: '123456', // 弱密码
        contact: '13800138000',
        code: '123456'
      });

    expect(res.status).toBe(400);
  });
});
```

---

*最后更新: 2025-11-25*
