// 通用类型定义

// 分页请求属性
export type PaginationProps<T = {}> = T & {
  pageSize?: number | string;
  pageNum?: number | string;
  offset?: number | string;
};

// 分页响应
export type PaginationResponse<T = any> = {
  list: T[];
  total: number;
};
