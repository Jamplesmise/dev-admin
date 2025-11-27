/**
 * 分页相关类型定义
 */

export type PaginationProps<T = {}> = T & {
  offset?: number;
  pageSize?: number;
};

export type PaginationResponse<T> = {
  total: number;
  list: T[];
};
