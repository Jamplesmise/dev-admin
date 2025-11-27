import { connectionMongo, getMongoModel } from '../../common/mongo';
import type { WorkOrderSchemaType } from '../../../global/support/workorder/type';
import {
  WorkOrderCollectionName,
  WorkOrderTypeEnum,
  WorkOrderStatusEnum,
  WorkOrderPriorityEnum
} from '../../../global/support/workorder/constant';
import { customAlphabet } from 'nanoid';

const { Schema } = connectionMongo;

// 生成工单号
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);

export const WorkOrderSchema = new Schema(
  {
    // 工单号
    orderId: {
      type: String,
      default: () => `WO${nanoid()}`,
      unique: true,
      index: true
    },

    // 提交人
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user'
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'team'
    },
    contactEmail: {
      type: String,
      required: true
    },

    // 工单内容
    type: {
      type: String,
      enum: Object.values(WorkOrderTypeEnum),
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000
    },
    attachments: [
      {
        filename: String,
        url: String,
        size: Number
      }
    ],
    priority: {
      type: String,
      enum: Object.values(WorkOrderPriorityEnum),
      default: WorkOrderPriorityEnum.medium
    },

    // 状态
    status: {
      type: String,
      enum: Object.values(WorkOrderStatusEnum),
      default: WorkOrderStatusEnum.created,
      index: true
    },

    // 处理信息
    assignee: {
      type: String
    },
    resolution: {
      type: String
    },
    resolveTime: {
      type: Date
    },

    // 内部备注
    internalNotes: [
      {
        content: String,
        createdBy: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 索引
try {
  // 用户查询自己的工单
  WorkOrderSchema.index({ userId: 1, createTime: -1 });
  // 管理员列表（状态 + 优先级 + 时间）
  WorkOrderSchema.index({ status: 1, priority: -1, createTime: -1 });
  // 类型查询
  WorkOrderSchema.index({ type: 1, status: 1 });
} catch (error) {
  console.log(error);
}

export const MongoWorkOrder = getMongoModel<WorkOrderSchemaType>(
  WorkOrderCollectionName,
  WorkOrderSchema
);
