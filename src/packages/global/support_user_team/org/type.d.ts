/**
 * 组织/部门类型定义
 * 同步自官方 FastGPT: packages/global/support/user/team/org/type.d.ts
 */
import type { TeamPermission } from '../../support/permission/user/controller';

type OrgSchemaType = {
  _id: string;
  teamId: string;
  pathId: string;
  path: string;
  name: string;
  avatar: string;
  description?: string;
  updateTime: Date;
};

type OrgMemberSchemaType = {
  _id: string;
  teamId: string;
  orgId: string;
  tmbId: string;
};

export type OrgListItemType = OrgSchemaType & {
  permission?: TeamPermission;
  total: number; // members + children orgs
};

export type OrgType = Omit<OrgSchemaType, 'avatar'> & {
  avatar: string;
  permission: TeamPermission;
  members: OrgMemberSchemaType[];
  total: number; // members + children orgs
};
