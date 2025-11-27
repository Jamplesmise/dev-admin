// OAuth 提供商
export enum OAuthProviderEnum {
  github = 'github',
  google = 'google',
  dingtalk = 'dingtalk',
  feishu = 'feishu',
  wechat = 'wechat'
}

// 微信登录状态
export enum WxLoginStatusEnum {
  waiting = 'waiting',
  scanned = 'scanned',
  confirmed = 'confirmed',
  expired = 'expired'
}

// OAuth 提供商显示名称
export const OAuthProviderMap: Record<OAuthProviderEnum, string> = {
  [OAuthProviderEnum.github]: 'GitHub',
  [OAuthProviderEnum.google]: 'Google',
  [OAuthProviderEnum.dingtalk]: '钉钉',
  [OAuthProviderEnum.feishu]: '飞书',
  [OAuthProviderEnum.wechat]: '微信'
};

// 验证码过期时间（秒）
export const CAPTCHA_EXPIRE_SECONDS = 300; // 5分钟

// 微信二维码过期时间（秒）
export const WX_QR_EXPIRE_SECONDS = 300; // 5分钟
