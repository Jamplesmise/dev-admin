// 评估项目 Schema 定义

import {
  EvaluationCollectionName,
  EvaluationItemCollectionName,
  EvaluationItemStatusEnum,
  MAX_RETRY_COUNT
} from '../../../../global/core/app/evaluation/constant';
import type { EvaluationItemSchemaType } from '../../../../global/core/app/evaluation/type';
import { connectionMongo, getMongoModel } from '../../../common/mongo';

const { Schema } = connectionMongo;

// 评分详情子文档
const ScoreDetailSchema = new Schema(
  {
    metric: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    reason: {
      type: String
    }
  },
  { _id: false }
);

// Token 使用量子文档
const TokenUsageSchema = new Schema(
  {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  { _id: false }
);

// 评估项目主文档
export const EvaluationItemSchema = new Schema(
  {
    evaluationId: {
      type: Schema.Types.ObjectId,
      ref: EvaluationCollectionName,
      required: true
    },

    // 测试用例
    input: {
      type: String,
      required: true
    },
    expectedOutput: {
      type: String
    },
    context: {
      type: String
    },
    variables: {
      type: Schema.Types.Mixed,
      default: {}
    },
    history: {
      type: [
        {
          role: String,
          content: String
        }
      ],
      default: []
    },

    // 实际结果
    actualOutput: {
      type: String
    },
    responseTime: {
      type: Number
    },
    tokenUsage: {
      type: TokenUsageSchema
    },

    // 评分
    scores: [ScoreDetailSchema],
    totalScore: {
      type: Number,
      default: 0
    },
    passed: {
      type: Boolean,
      default: false
    },

    // 状态
    status: {
      type: String,
      enum: Object.values(EvaluationItemStatusEnum),
      default: EvaluationItemStatusEnum.pending
    },
    error: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0,
      max: MAX_RETRY_COUNT
    },

    // 时间
    startTime: Date,
    completeTime: Date
  },
  {
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
  }
);

// 索引
try {
  EvaluationItemSchema.index({ evaluationId: 1, status: 1 });
  EvaluationItemSchema.index({ evaluationId: 1, createTime: 1 });
} catch (error) {
  console.log(error);
}

export const MongoEvaluationItemModel = getMongoModel<EvaluationItemSchemaType>(
  EvaluationItemCollectionName,
  EvaluationItemSchema
);
