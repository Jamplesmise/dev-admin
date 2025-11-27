/**
 * 邀请链接 Schema
 * 用于团队邀请成员加入
 */
import { getMongoModel, Schema } from '../../../common/mongo/index';
import { nanoid } from 'nanoid';

// 邀请链接状态枚举
export enum InvitationLinkStatusEnum {
  active = 'active',
  disabled = 'disabled'
}

// 邀请链接 Schema 类型（与官方 InvitationSchemaType 对齐）
export type InvitationLinkSchemaType = {
  _id: string;
  teamId: string;
  creatorTmbId: string;
  linkId: string;
  description?: string;
  maxUsage: number;
  usedCount: number;
  expireTime: Date;
  expires: Date; // 官方字段名
  description: string;
  members: string[]; // 已加入的成员 tmbId 列表
  forbidden?: boolean;
  status: `${InvitationLinkStatusEnum}`;
  createTime: Date;
};

const InvitationLinkSchema = new Schema(
  {
    // 所属团队
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'teams',
      required: true
    },
    // 创建者
    creatorTmbId: {
      type: Schema.Types.ObjectId,
      ref: 'team.member',
      required: true
    },
    // 唯一标识（用于 URL）
    linkId: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(12)
    },
    // 描述
    description: {
      type: String,
      default: ''
    },
    // 使用限制（0 表示不限制）
    maxUsage: {
      type: Number,
      default: -1
    },
    // 已使用次数
    usedCount: {
      type: Number,
      default: 0
    },
    // 过期时间
    expireTime: {
      type: Date,
      required: true
    },
    // 过期时间（官方字段名）
    expires: {
      type: Date
    },
    // 描述
    description: {
      type: String,
      default: ''
    },
    // 已加入的成员 tmbId 列表
    members: {
      type: [String],
      default: []
    },
    // 是否禁用（官方字段）
    forbidden: {
      type: Boolean,
      default: false
    },
    // 状态
    status: {
      type: String,
      enum: Object.values(InvitationLinkStatusEnum),
      default: InvitationLinkStatusEnum.active
    }
  },
  {
    timestamps: { createdAt: 'createTime', updatedAt: false }
  }
);

// 索引
try {
  InvitationLinkSchema.index({ teamId: 1, createTime: -1 });
  InvitationLinkSchema.index({ linkId: 1 }, { unique: true });
  InvitationLinkSchema.index({ expireTime: 1 }); // 用于清理过期链接
} catch (error) {
  console.log('InvitationLink schema index error:', error);
}

export const MongoInvitationLinkModel = getMongoModel<InvitationLinkSchemaType>(
  'invitation_links',
  InvitationLinkSchema
);
