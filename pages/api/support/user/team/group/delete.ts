import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support_permission/memberGroup/groupMemberSchema';
import type { DeleteGroupQuery } from '@fastgpt/global/support_user_team/group/api';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type DeleteResult = {
  success: boolean;
  deletedMemberCount: number;
};

async function handler(
  req: ApiRequestProps<unknown, DeleteGroupQuery>,
  _res: NextApiResponse
): Promise<DeleteResult> {
  const { groupId } = req.query;

  if (!groupId) {
    throw new Error('缺少分组 ID');
  }

  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 检查分组是否存在
  const existingGroup = await MongoMemberGroupModel.findOne({
    _id: groupId,
    teamId
  }).lean();

  if (!existingGroup) {
    throw new Error('分组不存在');
  }

  // 删除分组成员关系
  const deleteMemberResult = await MongoGroupMemberModel.deleteMany({
    groupId,
    teamId
  });

  // 删除分组
  await MongoMemberGroupModel.deleteOne({
    _id: groupId,
    teamId
  });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.DELETE_GROUP,
    metadata: { groupName: existingGroup.name }
  });

  return {
    success: true,
    deletedMemberCount: deleteMemberResult.deletedCount
  };
}

export default NextAPI(handler);
