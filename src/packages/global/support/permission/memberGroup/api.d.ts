/**
 * 群组 API 类型定义
 * 同步自官方 FastGPT: packages/global/support/permission/memberGroup/api.d.ts
 */

export type GetGroupListBody = {
  searchKey?: string;
  withMembers?: boolean;
};
