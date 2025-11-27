/**
 * 系统消息 Schema
 *
 * 存储需要弹窗展示的系统公告消息
 */

import { getMongoModel, Schema } from '../../common/mongo/index';

// 消息优先级枚举
export enum SystemMessagePriorityEnum {
  normal = 'normal',
  important = 'important',
  urgent = 'urgent'
}

// 按钮动作枚举
export enum SystemMessageButtonActionEnum {
  close = 'close',
  link = 'link',
  confirm = 'confirm'
}

// 目标用户枚举
export enum SystemMessageTargetEnum {
  all = 'all',
  free = 'free',
  paid = 'paid'
}

// 按钮类型
export type SystemMessageButtonType = {
  text: string;
  action: SystemMessageButtonActionEnum;
  url?: string;
};

// 系统消息 Schema 类型
export type SystemMessageSchemaType = {
  _id: string;
  title: string;
  content: string;
  priority: SystemMessagePriorityEnum;
  isActive: boolean;
  targetUsers: SystemMessageTargetEnum;
  buttons?: SystemMessageButtonType[];
  startTime?: Date;
  endTime?: Date;
  createTime: Date;
  updateTime: Date;
};

export const SystemMessageCollectionName = 'system_messages';

const SystemMessageSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000
    },
    priority: {
      type: String,
      enum: Object.values(SystemMessagePriorityEnum),
      default: SystemMessagePriorityEnum.normal
    },
    isActive: {
      type: Boolean,
      default: true
    },
    targetUsers: {
      type: String,
      enum: Object.values(SystemMessageTargetEnum),
      default: SystemMessageTargetEnum.all
    },
    buttons: [
      {
        text: String,
        action: {
          type: String,
          enum: Object.values(SystemMessageButtonActionEnum)
        },
        url: String
      }
    ],
    startTime: Date,
    endTime: Date
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 索引
SystemMessageSchema.index({ isActive: 1, startTime: 1, endTime: 1 });
SystemMessageSchema.index({ priority: 1 });

export const MongoSystemMessageModel = getMongoModel<SystemMessageSchemaType>(
  SystemMessageCollectionName,
  SystemMessageSchema
);
