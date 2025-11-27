import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { TeamMemberRoleEnum, TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';
import dayjs from 'dayjs';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type QueryType = {
  format?: 'csv' | 'xlsx';
};

/**
 * 角色映射到中文
 */
function getRoleLabel(role: string | undefined): string {
  if (role === TeamMemberRoleEnum.owner) {
    return '所有者';
  }
  // 非 owner 的成员（权限通过协作者系统控制）
  return role ? role : '成员';
}

/**
 * 状态映射到中文
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case TeamMemberStatusEnum.active:
      return '活跃';
    case TeamMemberStatusEnum.leave:
      return '离开';
    case TeamMemberStatusEnum.forbidden:
      return '禁用';
    default:
      return status;
  }
}

/**
 * 转义 CSV 字段
 */
function escapeCsvField(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 成员导出 API
 * GET /api/support/user/team/member/export
 */
async function handler(
  req: ApiRequestProps<{}, QueryType>,
  res: NextApiResponse
): Promise<void> {
  const teamId = getTeamIdFromReq(req);
  const { format = 'csv' } = req.query;

  // 目前只支持 CSV 格式
  if (format !== 'csv') {
    return Promise.reject('暂只支持 CSV 格式导出');
  }

  // 查询所有团队成员
  const teamMembers = await MongoTeamMemberModel.find({ teamId }).lean();

  if (teamMembers.length === 0) {
    // 返回只有表头的 CSV
    const headers = '\uFEFF用户名,邮箱,手机号,角色,状态,所属部门,加入时间\n';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="team_members_${dayjs().format('YYYY-MM-DD')}.csv"`);
    res.send(headers);
    return;
  }

  // 获取所有用户信息
  const userIds = teamMembers.map((m) => m.userId);
  const users = await MongoUserModel.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  // 获取所有成员的组织关系
  const tmbIds = teamMembers.map((m) => String(m._id));
  const orgMembers = await MongoOrgMemberModel.find({ teamId, tmbId: { $in: tmbIds } }).lean();

  // 获取所有组织信息
  const orgIds = [...new Set(orgMembers.map((om) => String(om.orgId)))];
  const orgs = await MongoOrgModel.find({ _id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map((o) => [String(o._id), o]));

  // 构建成员到组织路径的映射
  const tmbOrgMap = new Map<string, string[]>();
  for (const om of orgMembers) {
    const tmbId = String(om.tmbId);
    const org = orgMap.get(String(om.orgId));
    if (org) {
      if (!tmbOrgMap.has(tmbId)) {
        tmbOrgMap.set(tmbId, []);
      }
      tmbOrgMap.get(tmbId)!.push(org.path || org.name);
    }
  }

  // 生成 CSV 内容
  // BOM + 表头
  let csv = '\uFEFF用户名,邮箱,手机号,角色,状态,所属部门,加入时间\n';

  for (const member of teamMembers) {
    const user = userMap.get(String(member.userId));
    const departments = tmbOrgMap.get(String(member._id)) || [];

    const row = [
      escapeCsvField(member.name || user?.username || ''),
      escapeCsvField(user?.email || ''),
      escapeCsvField(user?.phone || ''),
      escapeCsvField(getRoleLabel(member.role)),
      escapeCsvField(getStatusLabel(member.status)),
      escapeCsvField(departments.join('; ')),
      escapeCsvField(
        member.createTime ? dayjs(member.createTime).format('YYYY-MM-DD HH:mm:ss') : ''
      )
    ].join(',');

    csv += row + '\n';
  }

  // 设置响应头
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="team_members_${dayjs().format('YYYY-MM-DD')}.csv"`);
  res.send(csv);
}

export default NextAPI(handler);
