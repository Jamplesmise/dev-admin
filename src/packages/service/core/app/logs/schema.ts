/**
 * 应用对话日志 Schema
 * 集合名：app_chat_logs
 */
import { connectionMongo, getMongoModel } from '../../../common/mongo';

const { Schema } = connectionMongo;

export const ChatLogCollectionName = 'app_chat_logs';

// Schema 类型定义
export type AppChatLogSchemaType = {
  _id: string;
  appId: string;
  teamId: string;
  chatId: string;
  userId: string;
  source: string;
  sourceName?: string;
  createTime: Date;
  updateTime: Date;
  chatItemCount: number;
  errorCount: number;
  totalPoints: number;
  goodFeedbackCount: number;
  badFeedbackCount: number;
  totalResponseTime: number;
  isFirstChat: boolean;
};

const ChatLogSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  appId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  chatId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  sourceName: {
    type: String
  },
  createTime: {
    type: Date,
    required: true
  },
  updateTime: {
    type: Date,
    required: true
  },
  // 累计统计字段
  chatItemCount: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  goodFeedbackCount: {
    type: Number,
    default: 0
  },
  badFeedbackCount: {
    type: Number,
    default: 0
  },
  totalResponseTime: {
    type: Number,
    default: 0
  },
  isFirstChat: {
    type: Boolean,
    default: false
  }
});

// 索引
try {
  // 按团队和应用查询
  ChatLogSchema.index({ teamId: 1, appId: 1, source: 1, updateTime: -1 });
  // 首次对话索引
  ChatLogSchema.index({ isFirstChat: 1, teamId: 1, appId: 1, source: 1, createTime: -1 });
  // 用户统计
  ChatLogSchema.index({ teamId: 1, appId: 1, userId: 1 });
  // 唯一对话
  ChatLogSchema.index({ teamId: 1, appId: 1, chatId: 1 });
} catch (error) {
  console.log(error);
}

export const MongoAppChatLogModel = getMongoModel<AppChatLogSchemaType>(
  ChatLogCollectionName,
  ChatLogSchema
);
