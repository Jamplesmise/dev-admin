// 聊天设置 Schema 定义

import { TeamCollectionName, TeamMemberCollectionName } from '../../../../global/support_user_team/constant';
import {
  ChatSettingCollectionName,
  ThemeEnum,
  DEFAULT_CHAT_SETTING,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  HOME_WELCOME_MAX_LENGTH
} from '../../../../global/core/chat/setting/constant';
import type { ChatSettingSchemaType } from '../../../../global/core/chat/setting/type';
import { connectionMongo, getMongoModel } from '../../../common/mongo';

const { Schema } = connectionMongo;

// 偏好设置子文档
const PreferencesSchema = new Schema(
  {
    theme: {
      type: String,
      enum: Object.values(ThemeEnum),
      default: DEFAULT_CHAT_SETTING.theme
    },
    fontSize: {
      type: Number,
      default: DEFAULT_CHAT_SETTING.fontSize,
      min: FONT_SIZE_MIN,
      max: FONT_SIZE_MAX
    },
    codeTheme: {
      type: String,
      default: DEFAULT_CHAT_SETTING.codeTheme
    }
  },
  { _id: false }
);

// 聊天设置主文档
export const ChatSettingSchema = new Schema(
  {
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: TeamMemberCollectionName,
      required: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },

    // 首页设置
    homeEnabled: {
      type: Boolean,
      default: DEFAULT_CHAT_SETTING.homeEnabled
    },
    homeWelcome: {
      type: String,
      default: DEFAULT_CHAT_SETTING.homeWelcome,
      maxlength: HOME_WELCOME_MAX_LENGTH
    },
    homeBackground: {
      type: String
    },

    // 默认设置
    defaultAppId: {
      type: Schema.Types.ObjectId,
      ref: 'apps'
    },
    sidebarCollapsed: {
      type: Boolean,
      default: DEFAULT_CHAT_SETTING.sidebarCollapsed
    },

    // 偏好设置
    preferences: {
      type: PreferencesSchema,
      default: () => ({})
    }
  },
  {
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
  }
);

// 索引：每个团队成员只有一个设置
try {
  ChatSettingSchema.index({ teamId: 1, tmbId: 1 }, { unique: true });
} catch (error) {
  console.log(error);
}

export const MongoChatSettingModel = getMongoModel<ChatSettingSchemaType>(
  ChatSettingCollectionName,
  ChatSettingSchema
);
