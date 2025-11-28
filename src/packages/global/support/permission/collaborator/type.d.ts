import type { ResourceTypeEnum, CollaboratorTypeEnum } from './constant';

// 协作者 Schema 类型 (与官方 FastGPT resource_permissions 集合兼容)
export type CollaboratorSchemaType = {
  _id: string;
  teamId: string;

  // 资源信息
  resourceId?: string; // 可选：资源 ID (app/dataset 的 ObjectId)
  resourceType: `${ResourceTypeEnum}`;
  resourceName?: string; // 可选：资源名称（用于模型等场景）

  // 协作者类型（三选一）
  tmbId?: string; // 单个成员
  groupId?: string; // 分组
  orgId?: string; // 组织

  // 权限值（位运算）
  permission: number;

  // 时间字段（Pro API 扩展，便于查询和审计）
  createTime?: Date;
  updateTime?: Date;
};

// 协作者列表项类型
export type CollaboratorListItemType = {
  _id: string;
  type: `${CollaboratorTypeEnum}`; // 协作者类型
  targetId: string; // tmbId/groupId/orgId
  name: string; // 成员名/分组名/组织名
  avatar?: string;
  permission: number;
  createTime: Date;
};

// 协作者列表响应类型（官方格式）
export type CollaboratorListType = {
  clbs: CollaboratorListItemType[];
  parentClbs?: CollaboratorListItemType[];
};

// 单个协作者项类型（用于更新）
export type CollaboratorItemType = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  permission: number;
};

// 更新协作者请求
export type UpdateCollaboratorBody = {
  resourceId: string;
  collaborators: {
    type: `${CollaboratorTypeEnum}`;
    targetId: string; // tmbId/groupId/orgId
    permission: number;
  }[];
};

// 删除协作者请求
export type DeleteCollaboratorBody = {
  resourceId: string;
  collaboratorIds: string[]; // 协作者记录 ID 列表
};

// 获取协作者列表请求
export type GetCollaboratorListQuery = {
  resourceId: string;
};
