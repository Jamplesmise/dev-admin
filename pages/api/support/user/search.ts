/**
 * 用户搜索 API
 * GET /api/support/user/search
 *
 * 统一搜索成员、组织、分组，用于协作者选择等场景
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { Types } from 'mongoose';
import { TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 请求参数类型
type QueryType = {
  searchKey: string;
  members?: string; // 'true' | 'false'
  orgs?: string;
  groups?: string;
};

// 响应类型
type MemberResult = {
  tmbId: string;
  memberName: string;
  avatar: string;
  role: string;
  status: string;
};

type OrgResult = {
  _id: string;
  teamId: string;
  pathId: string;
  path: string;
  name: string;
  avatar?: string;
  description?: string;
};

type GroupResult = {
  _id: string;
  teamId: string;
  name: string;
  avatar?: string;
  updateTime: Date;
};

type ResponseType = {
  members: MemberResult[];
  orgs: OrgResult[];
  groups: GroupResult[];
};

// 转义正则表达式特殊字符
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function handler(
  req: ApiRequestProps<unknown, QueryType>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const {
    searchKey,
    members: membersStr = 'true',
    orgs: orgsStr = 'true',
    groups: groupsStr = 'true'
  } = req.query;

  const searchMembers = membersStr === 'true';
  const searchOrgs = orgsStr === 'true';
  const searchGroups = groupsStr === 'true';

  // 构建搜索条件（允许空搜索，返回所有结果）
  const searchTerm = searchKey?.trim() || '';
  const limit = 20;

  const result: ResponseType = {
    members: [],
    orgs: [],
    groups: []
  };

  const teamIdObj = new Types.ObjectId(teamId);

  // 并行执行三类搜索
  const promises: Promise<void>[] = [];

  if (searchMembers) {
    promises.push(
      (async () => {
        const memberQuery: Record<string, unknown> = {
          teamId: teamIdObj,
          status: TeamMemberStatusEnum.active
        };
        // 只有有搜索词时才添加名称过滤
        if (searchTerm) {
          const escapedKey = escapeRegExp(searchTerm);
          memberQuery.name = new RegExp(escapedKey, 'i');
        }

        const members = await MongoTeamMemberModel.find(memberQuery)
          .select('_id name avatar role status')
          .limit(limit)
          .lean();

        result.members = members.map((m) => ({
          tmbId: String(m._id),
          memberName: m.name,
          avatar: m.avatar || '',
          role: m.role,
          status: m.status
        }));
      })()
    );
  }

  if (searchOrgs) {
    promises.push(
      (async () => {
        const orgQuery: Record<string, unknown> = {
          teamId: teamIdObj
        };
        if (searchTerm) {
          const escapedKey = escapeRegExp(searchTerm);
          orgQuery.name = new RegExp(escapedKey, 'i');
        }

        const orgs = await MongoOrgModel.find(orgQuery)
          .select('_id teamId pathId path name avatar description')
          .limit(limit)
          .lean();

        result.orgs = orgs.map((o) => ({
          _id: String(o._id),
          teamId: String(o.teamId),
          pathId: o.pathId,
          path: o.path,
          name: o.name,
          avatar: o.avatar,
          description: o.description
        }));
      })()
    );
  }

  if (searchGroups) {
    promises.push(
      (async () => {
        const groupQuery: Record<string, unknown> = {
          teamId: teamIdObj
        };
        if (searchTerm) {
          const escapedKey = escapeRegExp(searchTerm);
          groupQuery.name = new RegExp(escapedKey, 'i');
        }

        const groups = await MongoMemberGroupModel.find(groupQuery)
          .select('_id teamId name avatar updateTime')
          .limit(limit)
          .lean();

        result.groups = groups.map((g) => ({
          _id: String(g._id),
          teamId: String(g.teamId),
          name: g.name,
          avatar: g.avatar,
          updateTime: g.updateTime
        }));
      })()
    );
  }

  await Promise.all(promises);

  return result;
}

export default NextAPI(handler);
