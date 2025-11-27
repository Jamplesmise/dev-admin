import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import type { TeamMemberItemType } from '@fastgpt/global/support_user_team/type';
import type { GetOrgMembersQuery, PaginatedResponse } from '@fastgpt/global/support_user_team/org/api';
import { getOrgChildrenPath, OrgCollectionName } from '@fastgpt/global/support_user_team/org/constant';
import type { OrgSchemaType } from '@fastgpt/global/support_user_team/org/type';
import mongoose from 'mongoose';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 最大每页数量
const MAX_PAGE_SIZE = 100;

type OrgMemberItemType = Omit<TeamMemberItemType<{ withPermission: false; withOrgs: true; withGroupRole: false }>, 'permission'>;

/**
 * 获取组织成员列表（分页）
 * GET /api/support/user/team/org/members
 */
async function handler(
  req: ApiRequestProps<unknown, GetOrgMembersQuery>,
  _res: NextApiResponse
): Promise<PaginatedResponse<OrgMemberItemType>> {
  const { pageNum, pageSize, orgPath } = req.query;
  const teamId = getTeamIdFromReq(req);

  // 参数验证 - 先验证再设默认值
  const rawPage = pageNum !== undefined ? Number(pageNum) : undefined;
  const rawSize = pageSize !== undefined ? Number(pageSize) : undefined;

  // 显式传入 0 或负数时报错
  if (rawPage !== undefined && rawPage < 1) {
    return Promise.reject('pageNum must be greater than 0');
  }

  if (rawSize !== undefined && rawSize < 1) {
    return Promise.reject('pageSize must be greater than 0');
  }

  const page = rawPage || 1;
  const size = Math.min(rawSize || 10, MAX_PAGE_SIZE);

  // 构建查询条件
  let orgIds: string[] = [];

  if (orgPath) {
    // 根据 orgPath 查找组织
    // orgPath 可能是精确路径或前缀路径
    const org = await MongoOrgModel.findOne({
      teamId,
      path: orgPath
    }).lean();

    if (org) {
      // 获取该组织及其子组织的所有成员
      const childPath = getOrgChildrenPath(org as OrgSchemaType);
      const orgs = await MongoOrgModel.find({
        teamId,
        $or: [{ _id: org._id }, { path: { $regex: `^${childPath}` } }]
      })
        .select('_id')
        .lean();

      orgIds = orgs.map((o) => String(o._id));
    }

    // 如果没找到组织，返回空结果
    if (orgIds.length === 0) {
      return {
        pageNum: page,
        pageSize: size,
        total: 0,
        data: []
      };
    }
  }

  // 构建成员查询条件 - 需要转换为 ObjectId
  const teamObjectId = new mongoose.Types.ObjectId(teamId);
  const memberQuery: Record<string, unknown> = { teamId: teamObjectId };
  if (orgIds.length > 0) {
    memberQuery.orgId = { $in: orgIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  // 获取组织成员的 tmbId 列表（去重）
  const orgMembers = await MongoOrgMemberModel.aggregate([
    { $match: memberQuery },
    { $group: { _id: '$tmbId' } }
  ]);

  const tmbIds = orgMembers.map((m) => m._id);
  const total = tmbIds.length;

  if (total === 0) {
    return {
      pageNum: page,
      pageSize: size,
      total: 0,
      data: []
    };
  }

  // 分页获取团队成员详情
  const skip = (page - 1) * size;
  const teamMembers = await MongoTeamMemberModel.find({
    _id: { $in: tmbIds },
    teamId: teamObjectId
  })
    .sort({ name: 1 })
    .skip(skip)
    .limit(size)
    .lean();

  // 获取每个成员所属的组织路径
  const memberTmbIds = teamMembers.map((m) => m._id);
  const memberOrgs = await MongoOrgMemberModel.aggregate([
    { $match: { teamId: teamObjectId, tmbId: { $in: memberTmbIds } } },
    {
      $lookup: {
        from: OrgCollectionName,
        localField: 'orgId',
        foreignField: '_id',
        as: 'org'
      }
    },
    { $unwind: '$org' },
    {
      $group: {
        _id: '$tmbId',
        orgs: {
          $push: {
            $concat: [
              { $ifNull: ['$org.path', ''] },
              '/',
              '$org.name'
            ]
          }
        }
      }
    }
  ]);

  // 构建 tmbId -> orgs 映射
  const orgsMap = new Map<string, string[]>();
  memberOrgs.forEach((mo) => {
    orgsMap.set(String(mo._id), mo.orgs);
  });

  // 组装返回数据
  const data: OrgMemberItemType[] = teamMembers.map((member) => ({
    userId: String(member.userId),
    tmbId: String(member._id),
    teamId: String(member.teamId),
    memberName: member.name,
    avatar: member.avatar || '',
    role: member.role,
    status: member.status,
    createTime: member.createTime,
    updateTime: member.updateTime,
    orgs: orgsMap.get(String(member._id)) || []
  }));

  return {
    pageNum: page,
    pageSize: size,
    total,
    data
  };
}

export default NextAPI(handler);
