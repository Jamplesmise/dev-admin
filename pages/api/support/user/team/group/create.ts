import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { addGroupMembers } from '@fastgpt/service/support_permission/memberGroup/controller';
import type { MemberGroupSchemaType } from '@fastgpt/global/support_user_team/group/type';
import type { PostCreateGroupBody } from '@fastgpt/global/support_user_team/group/api';
import { GroupMemberRole } from '@fastgpt/global/support_user_team/group/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getAuthFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<PostCreateGroupBody>,
  _res: NextApiResponse
): Promise<MemberGroupSchemaType> {
  const { name, avatar, memberIdList } = req.body;

  if (!name || !name.trim()) {
    throw new Error('分组名称不能为空');
  }

  const teamId = getTeamIdFromReq(req);
  const { tmbId } = getAuthFromReq(req);

  // 检查同名分组是否已存在
  const existingGroup = await MongoMemberGroupModel.findOne({
    teamId,
    name: name.trim()
  }).lean();

  if (existingGroup) {
    throw new Error('同名分组已存在');
  }

  // 创建分组
  const newGroup = await MongoMemberGroupModel.create({
    teamId,
    name: name.trim(),
    avatar
  });

  const groupId = String(newGroup._id);

  // 将创建者自动添加为 owner
  await addGroupMembers({
    teamId,
    groupId,
    tmbIds: [tmbId],
    role: GroupMemberRole.owner
  });

  // 如果有初始成员列表，添加其他成员（排除创建者）
  if (memberIdList && memberIdList.length > 0) {
    const otherMemberIds = memberIdList.filter((id) => id !== tmbId);

    if (otherMemberIds.length > 0) {
      await addGroupMembers({
        teamId,
        groupId,
        tmbIds: otherMemberIds,
        role: GroupMemberRole.member
      });
    }
  }

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CREATE_GROUP,
    metadata: { groupName: name.trim() }
  });

  return newGroup.toObject() as MemberGroupSchemaType;
}

export default NextAPI(handler);
