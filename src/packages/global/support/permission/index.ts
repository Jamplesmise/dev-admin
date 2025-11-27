/**
 * 权限系统导出索引
 */

// 类型
export * from './type';
export type { CollaboratorIdType, CollaboratorItemType, CollaboratorItemDetailType, CollaboratorListType, UpdateClbPermissionProps, DeletePermissionQuery } from './collaborator';

// 常量
export * from './constant';

// 工具函数
export * from './utils';

// 权限控制器
export { Permission, type PerConstructPros } from './controller';

// 团队权限
export * from './user/constant';
export { TeamPermission } from './user/controller';
