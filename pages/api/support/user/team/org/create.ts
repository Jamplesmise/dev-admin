import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import type { OrgSchemaType } from '@fastgpt/global/support_user_team/org/type';
import { getOrgChildrenPath } from '@fastgpt/global/support_user_team/org/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端期望的参数格式 (postCreateOrgData)
 * 注意：前端使用 orgId 而非 parentId 表示父组织
 */
type CreateOrgBody = {
  orgId?: string; // 父组织 ID，不传则创建根级组织
  name: string;
  description?: string;
  avatar?: string;
  orgId?: string;  // 父组织 ID，空字符串或不传表示创建为 ROOT 的子组织
};

/**
 * 获取或创建 ROOT 组织
 * ROOT 组织是每个团队的虚拟根节点，path = ''
 */
async function getOrCreateRootOrg(teamId: string): Promise<OrgSchemaType> {
  let rootOrg = await MongoOrgModel.findOne({ teamId, path: '' }).lean();

  if (!rootOrg) {
    // 自动创建 ROOT 组织
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
  req: ApiRequestProps<CreateOrgBody>,
  _res: NextApiResponse
): Promise<OrgSchemaType> {
  const { orgId: parentOrgId, name, avatar, description } = req.body;

  if (!name || !name.trim()) {
    throw new Error('组织名称不能为空');
  }

  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  let path = '';

  if (parentOrgId) {
    // 获取父组织信息
    const parentOrg = await MongoOrgModel.findOne({ _id: parentOrgId, teamId }).lean();
    if (!parentOrg) {
      throw new Error('父组织不存在');
    }
    path = getOrgChildrenPath(parentOrg as OrgSchemaType);
  } else {
    // orgId 为空或不存在，创建为 ROOT 的子组织
    const rootOrg = await getOrCreateRootOrg(teamId);
    path = getOrgChildrenPath(rootOrg);
  }

  // 检查同级是否有同名组织
  const existingOrg = await MongoOrgModel.findOne({ teamId, path, name: name.trim() }).lean();
  if (existingOrg) {
    throw new Error('同级已存在同名组织');
  }

  // 创建组织
  const newOrg = await MongoOrgModel.create({
    teamId,
    path,
    name: name.trim(),
    avatar,
    description
  });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CREATE_DEPARTMENT,
    metadata: { departmentName: name.trim() }
  });

  return newOrg.toObject() as OrgSchemaType;
}

export default NextAPI(handler);
