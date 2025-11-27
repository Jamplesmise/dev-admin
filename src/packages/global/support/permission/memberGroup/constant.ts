/**
 * 群组成员角色常量
 * 同步自官方 FastGPT: packages/global/support/permission/memberGroup/constant.ts
 */

import { CommonPerKeyEnum, CommonRoleList } from '../constant';
import { type RoleListType } from '../type';

export enum GroupMemberRole {
  owner = 'owner',
  admin = 'admin',
  member = 'member'
}

export const memberGroupPermissionList: RoleListType = {
  [CommonPerKeyEnum.read]: {
    ...CommonRoleList[CommonPerKeyEnum.read],
    value: 0b100
  },
  [CommonPerKeyEnum.write]: {
    ...CommonRoleList[CommonPerKeyEnum.write],
    value: 0b010
  },
  [CommonPerKeyEnum.manage]: {
    ...CommonRoleList[CommonPerKeyEnum.manage],
    value: 0b001
  }
};
