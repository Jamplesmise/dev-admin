/**
 * 权限类型定义
 * 同步自官方 FastGPT: packages/global/support/permission/type.ts
 */

import type { CommonPerKeyEnum, CommonRoleKeyEnum, PerResourceTypeEnum } from './constant';

// PermissionValueType, the type of permission's value is a number, which is a bit field actually.
// It is spired by the permission system in Linux.
// The lowest 3 bits present the permission of reading, writing and managing.
// The higher bits are advanced permissions or extended permissions, which could be customized.
export type PermissionValueType = number;
export type RoleValueType = number;

export type ResourceType = `${PerResourceTypeEnum}`;

/**
 * Define the roles. Each role is a binary number, only one bit is set to 1.
 */
export type RoleListType<T extends string | number | symbol = CommonRoleKeyEnum> = Readonly<
  Record<
    T | CommonRoleKeyEnum,
    Readonly<{
      name: string;
      description: string;
      value: RoleValueType;
      checkBoxType: 'single' | 'multiple' | 'hidden';
    }>
  >
>;

/**
 * Define the permissions. Each permission is a binary number, only one bit is set to 1.
 */
export type PermissionListType<T extends string | number | symbol = CommonPerKeyEnum> = Readonly<
  Record<T | CommonPerKeyEnum, PermissionValueType>
>;

/**
 * Define the role-permission map. Each role has a permission.
 */
export type RolePerMapType = Readonly<Map<RoleValueType, PermissionValueType>>;

export type ResourcePermissionType = {
  teamId: string;
  resourceType: ResourceType;
  permission: PermissionValueType;
  resourceId: string;
  resourceName: string;
  tmbId?: string;
  groupId?: string;
  orgId?: string;
};

export type PermissionSchemaType = {
  defaultPermission: PermissionValueType;
  inheritPermission: boolean;
};
