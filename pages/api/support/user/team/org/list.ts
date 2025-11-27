import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import type { OrgListItemType, OrgSchemaType } from '@fastgpt/global/support_user_team/org/type';
import { getOrgChildrenPath } from '@fastgpt/global/support_user_team/org/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { ManageRoleVal } from '@fastgpt/global/support/permission/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端请求参数格式
 * POST /api/support/user/team/org/list
 */
type GetOrgListRequest = {
  orgId: string; // 父组织 ID，空字符串表示根级
  withPermission?: boolean;
  searchKey?: string;
};

/**
 * 获取或创建 ROOT 组织
 */
async function getOrCreateRootOrg(teamId: string): Promise<OrgSchemaType> {
  let rootOrg = await MongoOrgModel.findOne({ teamId, path: '' }).lean();

  if (!rootOrg) {
    rootOrg = await MongoOrgModel.create({
      teamId,
      name: 'ROOT',
      path: ''
    });
    rootOrg = rootOrg.toObject();
  }

  return rootOrg as OrgSchemaType;
}

async function handler(
  req: ApiRequestProps<GetOrgListRequest>,
  _res: NextApiResponse
): Promise<OrgListItemType[]> {
  const { orgId, searchKey } = req.body;
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 搜索模式
  if (searchKey) {
    const orgs = await MongoOrgModel.find({
      teamId,
      name: { $regex: searchKey, $options: 'i' }
    })
      .sort({ name: 1 })
      .lean();

    // 搜索模式不需要兼容处理，因为用户是通过搜索结果进入的
    return buildOrgListResponse(orgs as OrgSchemaType[], teamId, tmbId, false);
  }

  // 正常列表模式
  let query: Record<string, unknown> = { teamId };
  let isRootQuery = false;

  if (orgId) {
    // 获取父组织信息
    const parentOrg = await MongoOrgModel.findOne({ _id: orgId, teamId }).lean();
    if (!parentOrg) {
      throw new Error('父组织不存在');
    }
    const parentPath = getOrgChildrenPath(parentOrg as OrgSchemaType);
    query.path = parentPath;
  } else {
    // 获取根级组织 (path 为空字符串)
    query.path = '';
    isRootQuery = true; // 标记为根级查询，需要兼容处理
  }

  const orgs = await MongoOrgModel.find(query).sort({ name: 1 }).lean();

  return buildOrgListResponse(orgs as OrgSchemaType[], teamId, tmbId, isRootQuery);
}

/**
 * 构建组织列表响应
 *
 * @param orgs - 组织列表
 * @param teamId - 团队 ID
 * @param tmbId - 团队成员 ID
 * @param isRootQuery - 是否为根级查询（orgId 为空）
 */
async function buildOrgListResponse(
  orgs: OrgSchemaType[],
  teamId: string,
  tmbId: string,
  isRootQuery: boolean = false
): Promise<OrgListItemType[]> {
  if (orgs.length === 0) {
    return [];
  }

  const orgIds = orgs.map((org) => org._id);

  // 检查当前用户在各组织中是否为成员
  const myOrgMemberships = await MongoOrgMemberModel.find({
    teamId,
    orgId: { $in: orgIds },
    tmbId
  }).lean();

  const myOrgSet = new Set(myOrgMemberships.map((m) => String(m.orgId)));

  // 获取每个组织的成员数和子组织数
  const orgList: OrgListItemType[] = await Promise.all(
    orgs.map(async (org) => {
      const orgPath = getOrgChildrenPath(org);
      const orgIdStr = String(org._id);

      const [memberCount, childCount] = await Promise.all([
        MongoOrgMemberModel.countDocuments({ teamId, orgId: org._id }),
        MongoOrgModel.countDocuments({ teamId, path: orgPath })
      ]);

      // 如果是组织成员，给予管理权限
      const isMember = myOrgSet.has(orgIdStr);
      const permission = new TeamPermission({
        isOwner: false,
        role: isMember ? ManageRoleVal : 0
      });

      /**
       * 【兼容前端 Bug】
       *
       * 官方 FastGPT 前端 OrgManage/index.tsx 第 158-160 行有如下过滤逻辑：
       *   orgs.filter((org) => org.path !== '').map(...)
       *
       * 这会导致根级组织（path === ''）在团队根目录下不显示。
       *
       * 【问题分析】
       * - 根级组织的 path 是空字符串 ''
       * - 前端过滤掉了 path === '' 的组织
       * - 但在团队根目录下，应该显示这些一级部门
       *
       * 【兼容方案】
       * 当查询根级组织时（orgId 为空），将返回的组织 path 设置为 '/'，
       * 让前端能正确显示。这不影响实际的层级关系，因为：
       * 1. 点击进入子组织时，使用的是 orgId，不是 path
       * 2. path 主要用于显示层级和前端过滤
       *
       * 【原始代码】
       * path: org.path,
       */
      const displayPath = isRootQuery && org.path === '' ? '/' : org.path;

      return {
        _id: orgIdStr,
        teamId: String(org.teamId),
        pathId: org.pathId,
        path: displayPath,
        name: org.name,
        avatar: org.avatar || '',
        description: org.description,
        updateTime: org.updateTime,
        total: memberCount + childCount,
        permission
      };
    })
  );

  return orgList;
}

export default NextAPI(handler);
