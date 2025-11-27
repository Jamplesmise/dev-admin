import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support_permission/memberGroup/groupMemberSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import type { MemberGroupSchemaType } from '@fastgpt/global/support_user_team/group/type';
import type { PutUpdateGroupBody } from '@fastgpt/global/support_user_team/group/api';
import { GroupMemberRole } from '@fastgpt/global/support_user_team/group/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { Types } from '@fastgpt/service/common/mongo';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<PutUpdateGroupBody>,
  _res: NextApiResponse
): Promise<MemberGroupSchemaType> {
  const { groupId, name, avatar, memberList } = req.body;

  if (!groupId) {
    throw new Error('缺少分组 ID');
  }

  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);

  // 检查分组是否存在
  const existingGroup = await MongoMemberGroupModel.findOne({
    _id: groupId,
    teamId
  }).lean();

  if (!existingGroup) {
    throw new Error('分组不存在');
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) {
    if (!name.trim()) {
      throw new Error('分组名称不能为空');
    }

    // 检查是否有同名分组（排除自身）
    const duplicateGroup = await MongoMemberGroupModel.findOne({
      teamId,
      name: name.trim(),
      _id: { $ne: groupId }
    }).lean();

    if (duplicateGroup) {
      throw new Error('同名分组已存在');
    }

    updateData.name = name.trim();
  }

  if (avatar !== undefined) {
    updateData.avatar = avatar;
  }

  // 更新分组基本信息
  if (Object.keys(updateData).length > 0) {
    await MongoMemberGroupModel.updateOne(
      { _id: groupId, teamId },
      { $set: updateData }
    );
  }

  // 更新成员列表（如果提供）
  if (memberList !== undefined) {
    // 获取当前成员
    const currentMembers = await MongoGroupMemberModel.find({ groupId }).lean();
    const currentMemberMap = new Map(currentMembers.map((m) => [String(m.tmbId), m]));
    const newTmbIds = new Set(memberList.map((m) => m.tmbId));

    // 计算需要删除的成员
    const toRemove = [...currentMemberMap.keys()].filter((id) => !newTmbIds.has(id));

    // 计算需要添加的成员
    const toAdd = memberList.filter((m) => !currentMemberMap.has(m.tmbId)).map((m) => m.tmbId);

    if (toRemove.length > 0) {
      await MongoGroupMemberModel.deleteMany({
        groupId,
        tmbId: { $in: toRemove }
      });
    }

    // 使用 bulkWrite 批量处理添加和更新操作
    const bulkOps: {
      insertOne?: { document: Record<string, unknown> };
      updateOne?: { filter: Record<string, unknown>; update: Record<string, unknown> };
    }[] = [];

    for (const member of memberList) {
      const existingMember = currentMemberMap.get(member.tmbId);

      if (!existingMember) {
        // 新增成员 - 使用 ObjectId 确保类型一致
        bulkOps.push({
          insertOne: {
            document: {
              teamId: new Types.ObjectId(teamId),
              groupId: new Types.ObjectId(groupId),
              tmbId: new Types.ObjectId(member.tmbId),
              role: member.role || GroupMemberRole.member
            }
          }
        });
      } else if (existingMember.role !== (member.role || GroupMemberRole.member)) {
        // 角色有变化才更新
        bulkOps.push({
          updateOne: {
            filter: { groupId: new Types.ObjectId(groupId), tmbId: new Types.ObjectId(member.tmbId) },
            update: { $set: { role: member.role || GroupMemberRole.member } }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await MongoGroupMemberModel.bulkWrite(bulkOps);
    }

    // 记录审计日志（如果有成员变更）
    if (toRemove.length > 0 || toAdd.length > 0) {
      // 查询被移除和添加的成员名称
      const allTmbIds = [...toRemove, ...toAdd];
      const memberInfos = await MongoTeamMemberModel.find({
        _id: { $in: allTmbIds }
      }).lean();

      const tmbIdToName = new Map<string, string>();
      memberInfos.forEach((m) => {
        tmbIdToName.set(String(m._id), m.name || String(m._id));
      });

      // 构建详细的变更描述
      const changes: string[] = [];
      if (toAdd.length > 0) {
        const addedNames = toAdd.map((id) => tmbIdToName.get(id) || id).join('、');
        changes.push(`添加成员：${addedNames}`);
      }
      if (toRemove.length > 0) {
        const removedNames = toRemove.map((id) => tmbIdToName.get(id) || id).join('、');
        changes.push(`移除成员：${removedNames}`);
      }

      await addAuditLog({
        teamId,
        tmbId: currentTmbId,
        event: AuditEventEnum.CREATE_GROUP, // 使用 CREATE_GROUP 事件（groupName 参数）
        metadata: { groupName: `${existingGroup.name}（${changes.join('；')}）` }
      });
    }
  }

  // 返回更新后的分组
  const updatedGroup = await MongoMemberGroupModel.findById(groupId).lean();
  return updatedGroup as MemberGroupSchemaType;
}

export default NextAPI(handler);
