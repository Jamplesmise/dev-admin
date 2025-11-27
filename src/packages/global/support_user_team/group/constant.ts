export const DefaultGroupName = 'DEFAULT_GROUP';

export const MemberGroupCollectionName = 'member_groups';
export const GroupMemberCollectionName = 'group_members';

// 分组成员角色 - 同步自官方 FastGPT
export enum GroupMemberRole {
  owner = 'owner',
  admin = 'admin',
  member = 'member'
}

export const GroupMemberRoleMap = {
  [GroupMemberRole.owner]: {
    label: 'user.team.group.role.owner',
    value: GroupMemberRole.owner
  },
  [GroupMemberRole.member]: {
    label: 'user.team.group.role.member',
    value: GroupMemberRole.member
  }
};
