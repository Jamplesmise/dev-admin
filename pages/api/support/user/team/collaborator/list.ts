/**
 * 团队协作者列表 API
 * GET /api/support/user/team/collaborator/list
 *
 * 获取团队级别的协作者权限列表
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoCollaboratorModel } from '@fastgpt/service/support_permission/collaborator/schema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import { Permission } from '@fastgpt/global/support/permission/controller';
import type { CollaboratorListType, CollaboratorItemDetailType } from '@fastgpt/global/support/permission/collaborator';
import { Types } from 'mongoose';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<CollaboratorListType> {
  const teamId = getTeamIdFromReq(req);
  const teamIdObj = new Types.ObjectId(teamId);

  // 查询团队级别的协作者（resourceType = 'team'）
  const collaborators = await MongoCollaboratorModel.find({
    teamId: teamIdObj,
    resourceType: ResourceTypeEnum.team
  }).lean();

  if (collaborators.length === 0) {
    return { clbs: [] };
  }

  // 收集所有需要查询的 ID
  const tmbIds: string[] = [];
  const groupIds: string[] = [];
  const orgIds: string[] = [];

  collaborators.forEach((collab) => {
    if (collab.tmbId) tmbIds.push(String(collab.tmbId));
    if (collab.groupId) groupIds.push(String(collab.groupId));
    if (collab.orgId) orgIds.push(String(collab.orgId));
  });

  // 批量查询所有相关数据
  const [members, groups, orgs] = await Promise.all([
    tmbIds.length > 0
      ? MongoTeamMemberModel.find(
          { _id: { $in: tmbIds.map((id) => new Types.ObjectId(id)) } },
          'name avatar'
        ).lean()
      : [],
    groupIds.length > 0
      ? MongoMemberGroupModel.find(
          { _id: { $in: groupIds.map((id) => new Types.ObjectId(id)) } },
          'name avatar'
        ).lean()
      : [],
    orgIds.length > 0
      ? MongoOrgModel.find(
          { _id: { $in: orgIds.map((id) => new Types.ObjectId(id)) } },
          'name avatar'
        ).lean()
      : []
  ]);

  // 构建查找 Map
  const memberMap = new Map(members.map((m) => [String(m._id), m]));
  const groupMap = new Map(groups.map((g) => [String(g._id), g]));
  const orgMap = new Map(orgs.map((o) => [String(o._id), o]));

  // 组装结果
  const clbs: CollaboratorItemDetailType[] = [];

  for (const collab of collaborators) {
    let name = '';
    let avatar = '';

    if (collab.tmbId) {
      const member = memberMap.get(String(collab.tmbId));
      name = member?.name || '未知成员';
      avatar = member?.avatar || '';

      clbs.push({
        teamId: String(collab.teamId),
        permission: new Permission({ role: collab.permission }),
        name,
        avatar,
        tmbId: String(collab.tmbId)
      });
    } else if (collab.groupId) {
      const group = groupMap.get(String(collab.groupId));
      name = group?.name || '未知分组';
      avatar = group?.avatar || '';

      clbs.push({
        teamId: String(collab.teamId),
        permission: new Permission({ role: collab.permission }),
        name,
        avatar,
        groupId: String(collab.groupId)
      });
    } else if (collab.orgId) {
      const org = orgMap.get(String(collab.orgId));
      name = org?.name || '未知组织';
      avatar = org?.avatar || '';

      clbs.push({
        teamId: String(collab.teamId),
        permission: new Permission({ role: collab.permission }),
        name,
        avatar,
        orgId: String(collab.orgId)
      });
    }
  }

  return { clbs };
}

export default NextAPI(handler);
