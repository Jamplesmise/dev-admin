/**
 * Chat Schema
 *
 * 对话记录集合，用于存储应用的对话数据
 * 支持应用日志统计功能
 */

import { getMongoModel, Schema } from '../../common/mongo/index';

// Chat 状态枚举
export enum ChatStatusEnum {
  running = 'running',
  finish = 'finish',
  error = 'error'
}

// Chat Schema 类型
export type ChatSchemaType = {
  _id: string;
  appId: string;
  chatId: string;
  teamId: string;
  tmbId?: string;
  userId?: string;
  source: string; // 来源: api, share, iframe
  title?: string;
  messageCount: number;
  totalTokens: number;
  avgResponseTime?: number; // 平均响应时间（毫秒）
  satisfaction?: number; // 用户满意度评分 (1-5)
  status: ChatStatusEnum;
  createTime: Date;
  updateTime: Date;
};

export const ChatCollectionName = 'chats';

const ChatSchema = new Schema(
  {
    appId: {
      type: Schema.Types.ObjectId,
      ref: 'apps',
      required: true
    },
    chatId: {
      type: String,
      required: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'teams',
      required: true
    },
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: 'team_members'
    },
    userId: String,
    source: {
      type: String,
      enum: ['api', 'share', 'iframe', 'test'],
      default: 'api'
    },
    title: String,
    messageCount: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    avgResponseTime: Number,
    satisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    status: {
      type: String,
      enum: Object.values(ChatStatusEnum),
      default: ChatStatusEnum.running
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 索引
ChatSchema.index({ appId: 1, createTime: -1 });
ChatSchema.index({ teamId: 1, createTime: -1 });
ChatSchema.index({ appId: 1, status: 1 });
ChatSchema.index({ chatId: 1 }, { unique: true });

export const MongoChatModel = getMongoModel<ChatSchemaType>(ChatCollectionName, ChatSchema);
