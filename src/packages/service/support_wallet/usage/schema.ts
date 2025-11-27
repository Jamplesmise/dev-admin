/**
 * 使用记录 Schema
 * 对应 MongoDB 中的 usages 集合
 */
import { getMongoModel, Schema } from '../../common/mongo/index';

// 使用记录子项类型
export type UsageListItemType = {
  moduleName: string;
  model: string;
  amount: number;
  inputTokens: number;
  outputTokens: number;
};

// 使用记录类型
export type UsageSchemaType = {
  _id: string;
  teamId: string;
  tmbId: string;
  source: string; // 来源: training, api, chat, shareChat 等
  appName: string; // 项目名称
  totalPoints: number; // AI 积分消耗
  list: UsageListItemType[]; // 详细用量列表
  time: Date; // 时间
};

export const UsageCollectionName = 'usages';

// Schema 定义
const UsageListItemSchema = new Schema(
  {
    moduleName: { type: String, required: true },
    model: { type: String, required: true },
    amount: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 }
  },
  { _id: false }
);

const UsageSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team_members',
    required: true
  },
  source: {
    type: String,
    required: true
  },
  appName: {
    type: String,
    default: ''
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  list: {
    type: [UsageListItemSchema],
    default: []
  },
  time: {
    type: Date,
    default: Date.now
  }
});

// 索引
UsageSchema.index({ teamId: 1, time: -1 });
UsageSchema.index({ teamId: 1, tmbId: 1, time: -1 });
UsageSchema.index({ teamId: 1, source: 1, time: -1 });

export const MongoUsageModel = getMongoModel<UsageSchemaType>(UsageCollectionName, UsageSchema);
