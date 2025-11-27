// 应用评估模块常量定义

export const EvaluationCollectionName = 'evaluations';
export const EvaluationItemCollectionName = 'evaluation_items';

// 评估状态枚举 - 与官方 FastGPT 保持一致
export enum EvaluationStatusEnum {
  queuing = 0,
  evaluating = 1,
  completed = 2
}

// 评估项目状态枚举
export enum EvaluationItemStatusEnum {
  pending = 'pending',
  running = 'running',
  completed = 'completed',
  failed = 'failed'
}

// 评估指标枚举
export enum EvaluationMetricEnum {
  accuracy = 'accuracy',
  relevance = 'relevance',
  completeness = 'completeness',
  coherence = 'coherence',
  custom = 'custom'
}

// 默认值
export const DEFAULT_EVALUATION = {
  evaluatorModel: 'gpt-4',
  progress: 0,
  totalItems: 0,
  passedItems: 0,
  failedItems: 0,
  avgScore: 0
} as const;

// 限制
export const EVALUATION_NAME_MAX_LENGTH = 100;
export const EVALUATION_DESCRIPTION_MAX_LENGTH = 500;
export const TEST_CASE_INPUT_MAX_LENGTH = 5000;
export const TEST_CASE_OUTPUT_MAX_LENGTH = 10000;
export const TEST_CASE_CONTEXT_MAX_LENGTH = 5000;

// 默认指标阈值
export const DEFAULT_METRIC_THRESHOLD = 0.6;
export const DEFAULT_METRIC_WEIGHT = 1;

// 最大重试次数
export const MAX_RETRY_COUNT = 3;
