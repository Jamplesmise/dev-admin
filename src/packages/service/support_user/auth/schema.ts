import { getMongoModel, Schema } from '../../common/mongo/index';
import { OAuthProviderEnum, WxLoginStatusEnum } from '../../../global/support_user/auth/constants';
import type {
  OAuthBindingSchemaType,
  CaptchaSessionSchemaType,
  WxLoginSessionSchemaType
} from '../../../global/support_user/auth/type';

// OAuth 绑定
export const OAuthBindingCollectionName = 'user_oauth_bindings';

const OAuthBindingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  provider: {
    type: String,
    enum: Object.values(OAuthProviderEnum),
    required: true
  },
  providerId: {
    type: String,
    required: true
  },
  accessToken: String,
  refreshToken: String,
  profile: {
    nickname: String,
    avatar: String,
    email: String
  },
  bindTime: {
    type: Date,
    default: () => new Date()
  },
  lastLoginTime: {
    type: Date,
    default: () => new Date()
  }
});

OAuthBindingSchema.index({ userId: 1, provider: 1 }, { unique: true });
OAuthBindingSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const MongoOAuthBindingModel = getMongoModel<OAuthBindingSchemaType>(
  OAuthBindingCollectionName,
  OAuthBindingSchema
);

// 验证码会话
export const CaptchaSessionCollectionName = 'captcha_sessions';

const CaptchaSessionSchema = new Schema({
  captchaId: {
    type: String,
    required: true,
    unique: true
  },
  answer: {
    type: String,
    required: true
  },
  expireAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
});

export const MongoCaptchaSessionModel = getMongoModel<CaptchaSessionSchemaType>(
  CaptchaSessionCollectionName,
  CaptchaSessionSchema
);

// 微信登录会话
export const WxLoginSessionCollectionName = 'wx_login_sessions';

const WxLoginSessionSchema = new Schema({
  sceneId: {
    type: String,
    required: true,
    unique: true
  },
  ticket: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(WxLoginStatusEnum),
    default: WxLoginStatusEnum.waiting
  },
  openId: String,
  userId: Schema.Types.ObjectId,
  inviterId: String,
  expireAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
});

export const MongoWxLoginSessionModel = getMongoModel<WxLoginSessionSchemaType>(
  WxLoginSessionCollectionName,
  WxLoginSessionSchema
);
