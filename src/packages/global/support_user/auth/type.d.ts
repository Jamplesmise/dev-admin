import type { OAuthProviderEnum, WxLoginStatusEnum } from './constants';

// 用户基本信息
export type UserInfoType = {
  _id: string;
  username: string;
  avatar?: string;
  timezone?: string;
  status: string;
  createTime: string;
};

// OAuth 绑定 Schema
export type OAuthBindingSchemaType = {
  _id: string;
  userId: string;
  provider: OAuthProviderEnum;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  profile?: {
    nickname?: string;
    avatar?: string;
    email?: string;
  };
  bindTime: Date;
  lastLoginTime: Date;
};

// 验证码会话 Schema
export type CaptchaSessionSchemaType = {
  _id: string;
  captchaId: string;
  answer: string;
  expireAt: Date;
};

// 微信登录会话 Schema
export type WxLoginSessionSchemaType = {
  _id: string;
  sceneId: string;
  ticket: string;
  status: WxLoginStatusEnum;
  openId?: string;
  userId?: string;
  inviterId?: string;
  expireAt: Date;
};

// OAuth 登录请求
export type OAuthLoginRequest = {
  provider: OAuthProviderEnum;
  code: string;
  state?: string;
  redirectUri?: string;
};

// OAuth 登录响应
export type OAuthLoginResponse = {
  user: UserInfoType;
  token: string;
  isNewUser: boolean;
};

// 快速登录请求
export type FastLoginRequest = {
  token: string;
};

// 快速登录响应
export type FastLoginResponse = {
  user: UserInfoType;
  token: string;
};

// 获取微信二维码请求
export type GetWxQRRequest = {
  inviterId?: string;
};

// 获取微信二维码响应
export type GetWxQRResponse = {
  ticket: string;
  qrUrl: string;
  expireTime: number;
  sceneId: string;
};

// 检查微信登录状态请求
export type CheckWxStatusRequest = {
  sceneId: string;
};

// 检查微信登录状态响应
export type CheckWxStatusResponse = {
  status: WxLoginStatusEnum;
  user?: UserInfoType;
  token?: string;
};

// SSO 请求
export type SSORequest = {
  token: string;
  provider: string;
};

// SSO 响应
export type SSOResponse = {
  redirectUrl: string;
};

// 更新联系方式请求
export type UpdateContactRequest = {
  phone?: string;
  email?: string;
  verifyCode: string;
};

// 更新联系方式响应
export type UpdateContactResponse = {
  success: boolean;
};

// 获取图片验证码响应
export type GetImgCaptchaResponse = {
  captchaId: string;
  captchaImg: string;
  expireTime: number;
};

// 获取微信登录结果请求
export type GetWxLoginResultRequest = {
  code: string; // 微信授权码或场景 ID
  inviterId?: string; // 邀请者 ID
  bd_vid?: string; // 百度访问 ID
  msclkid?: string; // 微软点击 ID
  fastgpt_sem?: string; // FastGPT SEM 参数
  sourceDomain?: string; // 来源域名
};

// 获取微信登录结果响应
export type GetWxLoginResultResponse = {
  user: UserInfoType;
  token: string;
  isNewUser: boolean;
};
