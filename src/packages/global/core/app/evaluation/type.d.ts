// 应用评估模块类型定义
// 与官方 FastGPT 保持一致

import type { EvaluationStatusEnum } from './constant';

// 评估任务 Schema 类型
export type EvaluationSchemaType = {
  _id: string;
  teamId: string;
  tmbId: string;
  evalModel: string;
  appId: string;
  usageId: string;
  name: string;
  createTime: Date;
  finishTime?: Date;
  score?: number;
  errorMessage?: string;
};

// 评估项目 Schema 类型
export type EvalItemSchemaType = {
  evalId: string;
  question: string;
  expectedResponse: string;
  globalVariables?: Record<string, any>;
  history?: string;
  response?: string;
  responseTime?: Date;
  finishTime?: Date;
  status: EvaluationStatusEnum;
  retry: number;
  errorMessage?: string;
  accuracy?: number;
  relevance?: number;
  semanticAccuracy?: number;
  score?: number;
};

// 评估列表项类型（带额外信息）
export type evaluationType = Pick<
  EvaluationSchemaType,
  'name' | 'appId' | 'createTime' | 'finishTime' | 'evalModel' | 'errorMessage' | 'score'
> & {
  _id: string;
  executorAvatar: string;
  executorName: string;
  appAvatar: string;
  appName: string;
  completedCount: number;
  errorCount: number;
  totalCount: number;
};

// 评估项目列表项类型
export type listEvalItemsItem = EvalItemSchemaType & {
  evalItemId: string;
};
