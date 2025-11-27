// 验证码类型
export const VerificationCodeTypeEnum = {
  register: 'register', // 注册
  findPassword: 'findPassword', // 找回密码
  bindPhone: 'bindPhone', // 绑定手机
  bindEmail: 'bindEmail' // 绑定邮箱
} as const;

export type VerificationCodeType = keyof typeof VerificationCodeTypeEnum;

// 验证码配置
export const VERIFICATION_CODE_CONFIG = {
  // 验证码长度
  CODE_LENGTH: 6,

  // 验证码过期时间 (秒)
  EXPIRE_SECONDS: 300, // 5 分钟

  // 发送间隔 (秒)
  SEND_INTERVAL_SECONDS: 60, // 60 秒内不能重复发送

  // 每日发送上限
  DAILY_LIMIT: 10
} as const;

// Redis Key 前缀
export const VERIFICATION_CODE_REDIS_KEYS = {
  // 验证码存储: auth:code:{type}:{contact}
  CODE: 'auth:code',

  // 发送频率限制: auth:rate:{contact}
  RATE_LIMIT: 'auth:rate',

  // 每日发送计数: auth:daily:{contact}:{date}
  DAILY_COUNT: 'auth:daily'
} as const;

// 发送验证码请求
export type SendVerificationCodeRequest = {
  type: VerificationCodeType;
  contact: string; // 手机号或邮箱
  captchaId?: string; // 图形验证码 ID
  captchaCode?: string; // 图形验证码答案
};

// 发送验证码响应
export type SendVerificationCodeResponse = {
  success: true;
  expireTime: number; // 过期时间（秒）
};

// 验证验证码请求
export type VerifyCodeRequest = {
  type: VerificationCodeType;
  contact: string;
  code: string;
};
