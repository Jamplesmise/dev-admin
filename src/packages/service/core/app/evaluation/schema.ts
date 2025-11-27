// 评估任务 Schema 定义

import { TeamCollectionName, TeamMemberCollectionName } from '../../../../global/support_user_team/constant';
import {
  EvaluationCollectionName,
  EvaluationStatusEnum,
  EvaluationMetricEnum,
  DEFAULT_EVALUATION,
  DEFAULT_METRIC_THRESHOLD,
  DEFAULT_METRIC_WEIGHT,
  EVALUATION_NAME_MAX_LENGTH,
  EVALUATION_DESCRIPTION_MAX_LENGTH,
  TEST_CASE_INPUT_MAX_LENGTH,
  TEST_CASE_OUTPUT_MAX_LENGTH,
  TEST_CASE_CONTEXT_MAX_LENGTH
} from '../../../../global/core/app/evaluation/constant';
import type { EvaluationSchemaType } from '../../../../global/core/app/evaluation/type';
import { connectionMongo, getMongoModel } from '../../../common/mongo';

const { Schema } = connectionMongo;

// 测试用例子文档
const TestCaseSchema = new Schema(
  {
    input: {
      type: String,
      required: true,
      maxlength: TEST_CASE_INPUT_MAX_LENGTH
    },
    expectedOutput: {
      type: String,
      maxlength: TEST_CASE_OUTPUT_MAX_LENGTH
    },
    context: {
      type: String,
      maxlength: TEST_CASE_CONTEXT_MAX_LENGTH
    }
  },
  { _id: false }
);

// 评估指标子文档
const MetricSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      enum: Object.values(EvaluationMetricEnum)
    },
    weight: {
      type: Number,
      default: DEFAULT_METRIC_WEIGHT,
      min: 0,
      max: 10
    },
    threshold: {
      type: Number,
      default: DEFAULT_METRIC_THRESHOLD,
      min: 0,
      max: 1
    },
    customPrompt: {
      type: String
    }
  },
  { _id: false }
);

// 评估任务主文档
export const EvaluationSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: TeamMemberCollectionName,
      required: true
    },
    appId: {
      type: Schema.Types.ObjectId,
      ref: 'apps',
      required: true
    },

    // 基本信息
    name: {
      type: String,
      required: true,
      maxlength: EVALUATION_NAME_MAX_LENGTH
    },
    description: {
      type: String,
      maxlength: EVALUATION_DESCRIPTION_MAX_LENGTH
    },

    // 评估配置
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'datasets'
    },
    testCases: [TestCaseSchema],
    metrics: [MetricSchema],
    evaluatorModel: {
      type: String,
      default: DEFAULT_EVALUATION.evaluatorModel
    },

    // 状态
    status: {
      type: Number,
      enum: Object.values(EvaluationStatusEnum).filter((v) => typeof v === 'number'),
      default: EvaluationStatusEnum.queuing
    },
    progress: {
      type: Number,
      default: DEFAULT_EVALUATION.progress,
      min: 0,
      max: 100
    },

    // 结果统计
    totalItems: {
      type: Number,
      default: DEFAULT_EVALUATION.totalItems
    },
    passedItems: {
      type: Number,
      default: DEFAULT_EVALUATION.passedItems
    },
    failedItems: {
      type: Number,
      default: DEFAULT_EVALUATION.failedItems
    },
    avgScore: {
      type: Number,
      default: DEFAULT_EVALUATION.avgScore
    },

    // 错误信息
    error: {
      type: String
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
  EvaluationSchema.index({ teamId: 1, appId: 1, createTime: -1 });
  EvaluationSchema.index({ status: 1 });
} catch (error) {
  console.log(error);
}

export const MongoEvaluationModel = getMongoModel<EvaluationSchemaType>(
  EvaluationCollectionName,
  EvaluationSchema
);
