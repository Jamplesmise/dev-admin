/**
 * 团队相关常量
 * 同步自官方 FastGPT: packages/global/support/user/team/constant.ts
 */

export const TeamCollectionName = 'teams';
export const TeamMemberCollectionName = 'team_members';
export const TeamTagsCollectionName = 'team_tags';

// 注意：官方只有 owner 角色，权限通过 TeamPermission 类计算
export enum TeamMemberRoleEnum {
  owner = 'owner'
}

export const TeamMemberRoleMap = {
  [TeamMemberRoleEnum.owner]: {
    value: TeamMemberRoleEnum.owner,
    label: 'user.team.role.Owner'
  }
};

// 注意：官方没有 waiting 状态，邀请通过 invitationLink 实现
export enum TeamMemberStatusEnum {
  active = 'active',
  leave = 'leave',
  forbidden = 'forbidden'
}

export const TeamMemberStatusMap = {
  [TeamMemberStatusEnum.active]: {
    label: 'user.team.member.active',
    color: 'green.600'
  },
  [TeamMemberStatusEnum.leave]: {
    label: 'user.team.member.leave',
    color: 'red.600'
  },
  [TeamMemberStatusEnum.forbidden]: {
    label: 'user.team.member.forbidden',
    color: 'red.600'
  }
};

export const notLeaveStatus = {
  $not: {
    $in: [TeamMemberStatusEnum.leave, TeamMemberStatusEnum.forbidden]
  }
};
