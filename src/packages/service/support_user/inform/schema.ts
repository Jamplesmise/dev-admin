/**
 * 用户通知 Schema
 *
 * 存储用户站内通知
 */

import { getMongoModel, Schema } from '../../common/mongo/index';

// 通知类型枚举
export enum InformTypeEnum {
  system = 'system',
  team = 'team',
  billing = 'billing'
}

// 用户通知 Schema 类型
export type UserInformSchemaType = {
  _id: string;
  userId: string;
  type: InformTypeEnum;
  title: string;
  content: string;
  isRead: boolean;
  teamId?: string;
  linkUrl?: string;
  expireAt?: Date;
  createTime: Date;
};

export const UserInformCollectionName = 'user_informs';

const UserInformSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(InformTypeEnum),
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    isRead: {
      type: Boolean,
      default: false
    },
    // 关联数据
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'teams'
    },
    linkUrl: String,
    // 过期时间（可选 TTL）
    expireAt: Date
  },
  {
    timestamps: { createdAt: 'createTime', updatedAt: false }
  }
);

// 索引
UserInformSchema.index({ userId: 1, createTime: -1 });
UserInformSchema.index({ userId: 1, isRead: 1 });
UserInformSchema.index({ userId: 1, type: 1 });
UserInformSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export const MongoUserInformModel = getMongoModel<UserInformSchemaType>(
  UserInformCollectionName,
  UserInformSchema
);
