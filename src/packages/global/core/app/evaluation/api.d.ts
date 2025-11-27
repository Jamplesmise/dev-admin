// 应用评估 API 类型定义
// 与官方 FastGPT 保持一致

import type { PaginationProps } from '../../../../common/type';

// 获取评估列表请求
export type listEvaluationsBody = PaginationProps<{
  searchKey?: string;
}>;

// 获取评估项目列表请求
export type listEvalItemsBody = PaginationProps<{
  evalId: string;
}>;

// 重试评估项目请求
export type retryEvalItemBody = {
  evalItemId: string;
};

// 更新评估项目请求
export type updateEvalItemBody = {
  evalItemId: string;
  question: string;
  expectedResponse: string;
  variables: Record<string, string>;
};
