import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support_user_team/constant';
import type {
  PostUserSyncBody,
  PostUserSyncResponse,
  SyncErrorItem,
  SyncUserItem
} from '@fastgpt/global/support_user/sync/type';
import { getNanoid } from '@fastgpt/global/common/string/tools';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 验证请求参数
 */
function validateRequest(body: PostUserSyncBody): string | null {
  const { users, syncMode } = body;

  if (!users || !Array.isArray(users)) {
    return 'users 参数必填且必须是数组';
  }

  if (!syncMode || !['incremental', 'full'].includes(syncMode)) {
    return 'syncMode 必须是 incremental 或 full';
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user.externalId) {
      return `users[${i}] 缺少 externalId`;
    }
    if (!user.username) {
      return `users[${i}] 缺少 username`;
    }
  }

  return null;
}

/**
 * 验证当前用户权限（只有 owner 或有管理权限的用户可以同步）
 */
async function validatePermission(teamId: string, tmbId: string): Promise<boolean> {
  const member = await MongoTeamMemberModel.findById(tmbId).lean();
  if (!member) return false;

  // owner 直接有权限
  if (member.role === TeamMemberRoleEnum.owner) return true;

  // 其他角色检查协作者权限
  const { getTeamMemberPermission } = await import('@fastgpt/service/support_permission/controller');
  const permission = await getTeamMemberPermission({
    teamId,
    tmbId,
    role: member.role as `${TeamMemberRoleEnum}`
  });
  return permission.hasManagePer;
}

/**
 * 解析部门路径，创建不存在的组织
 * @param teamId 团队 ID
 * @param departmentPath 部门路径，如 "/公司/技术部/后端组"
 * @returns 最底层组织的 ID
 */
async function ensureOrgPath(teamId: string, departmentPath: string): Promise<string | null> {
  if (!departmentPath) return null;

  // 解析路径
  const parts = departmentPath.split('/').filter((p) => p.trim());
  if (parts.length === 0) return null;

  let currentPath = '';
  let orgId: string | null = null;

  for (const part of parts) {
    const parentPath = currentPath;
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    // 查找或创建组织
    let org = await MongoOrgModel.findOne({
      teamId,
      path: currentPath
    }).lean();

    if (!org) {
      // 创建组织
      const newOrg = await MongoOrgModel.create({
        teamId,
        pathId: getNanoid(),
        path: currentPath,
        name: part,
        avatar: ''
      });
      orgId = String(newOrg._id);
    } else {
      orgId = String(org._id);
    }
  }

  return orgId;
}

/**
 * 同步单个用户
 */
async function syncUser(
  teamId: string,
  userData: SyncUserItem,
  existingExternalIds: Set<string>
): Promise<{ action: 'created' | 'updated' | 'skipped'; error?: string }> {
  try {
    const { externalId, username, email, phone, avatar, department } = userData;

    // 查找用户（通过 externalId 存储在某个字段中，这里使用 email 或 phone 作为匹配）
    // 注意：实际项目中可能需要在 User 表添加 externalId 字段
    // 这里简化处理：优先用 email 匹配，其次用 phone
    let user = null;
    if (email) {
      user = await MongoUserModel.findOne({ email }).lean();
    }
    if (!user && phone) {
      user = await MongoUserModel.findOne({ phone }).lean();
    }

    let userId: string;
    let isNewUser = false;

    if (!user) {
      // 创建新用户
      const newUser = await MongoUserModel.create({
        username,
        email: email || undefined,
        phone: phone || undefined,
        avatar: avatar || ''
      });
      userId = String(newUser._id);
      isNewUser = true;
    } else {
      userId = String(user._id);

      // 检查信息是否有变化
      const hasChanges =
        user.username !== username ||
        (avatar && user.avatar !== avatar);

      if (!hasChanges) {
        // 检查是否已是团队成员
        const existingMember = await MongoTeamMemberModel.findOne({
          teamId,
          userId
        }).lean();

        if (existingMember && existingMember.status === TeamMemberStatusEnum.active) {
          return { action: 'skipped' };
        }
      }

      // 更新用户信息
      if (avatar && user.avatar !== avatar) {
        await MongoUserModel.updateOne({ _id: userId }, { avatar });
      }
    }

    // 查找或创建团队成员
    let teamMember = await MongoTeamMemberModel.findOne({
      teamId,
      userId
    }).lean();

    if (!teamMember) {
      // 创建团队成员（普通成员不设置 role，权限通过协作者系统控制）
      teamMember = await MongoTeamMemberModel.create({
        teamId,
        userId,
        name: username,
        status: TeamMemberStatusEnum.active,
        avatar: avatar || ''
      });
    } else {
      // 更新团队成员状态
      await MongoTeamMemberModel.updateOne(
        { _id: teamMember._id },
        {
          name: username,
          status: TeamMemberStatusEnum.active,
          ...(avatar ? { avatar } : {})
        }
      );
    }

    const tmbId = String(teamMember._id);

    // 处理部门
    if (department) {
      const orgId = await ensureOrgPath(teamId, department);
      if (orgId) {
        // 添加到组织（如果还没加入）
        const existingOrgMember = await MongoOrgMemberModel.findOne({
          teamId,
          orgId,
          tmbId
        }).lean();

        if (!existingOrgMember) {
          await MongoOrgMemberModel.create({
            teamId,
            orgId,
            tmbId
          });
        }
      }
    }

    return { action: isNewUser ? 'created' : 'updated' };
  } catch (error) {
    return {
      action: 'skipped',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 成员同步 API
 * POST /api/support/user/sync
 */
async function handler(
  req: ApiRequestProps<PostUserSyncBody>,
  _res: NextApiResponse
): Promise<PostUserSyncResponse> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { users, syncMode } = req.body;

  // 参数验证
  const validationError = validateRequest(req.body);
  if (validationError) {
    return Promise.reject({ code: 400, message: validationError });
  }

  // 权限验证
  const hasPermission = await validatePermission(teamId, tmbId);
  if (!hasPermission) {
    return Promise.reject({ code: 403, message: '权限不足，只有团队管理员可以执行同步操作' });
  }

  // 统计结果
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: SyncErrorItem[] = [];

  // 收集同步用户的 externalId
  const syncExternalIds = new Set(users.map((u) => u.externalId));

  // 逐个同步用户
  for (const userData of users) {
    const result = await syncUser(teamId, userData, syncExternalIds);

    switch (result.action) {
      case 'created':
        created++;
        break;
      case 'updated':
        updated++;
        break;
      case 'skipped':
        if (result.error) {
          errors.push({
            externalId: userData.externalId,
            reason: result.error
          });
        } else {
          skipped++;
        }
        break;
    }
  }

  // 全量同步模式：将不在同步列表中的成员标记为 inactive
  if (syncMode === 'full') {
    // 获取所有活跃成员
    const activeMembers = await MongoTeamMemberModel.find({
      teamId,
      status: TeamMemberStatusEnum.active,
      role: { $ne: TeamMemberRoleEnum.owner } // 不处理 owner
    }).lean();

    // 获取同步列表中用户的 userId
    const syncUserIds = new Set<string>();
    for (const userData of users) {
      if (userData.email) {
        const user = await MongoUserModel.findOne({ email: userData.email }).lean();
        if (user) syncUserIds.add(String(user._id));
      }
      if (userData.phone) {
        const user = await MongoUserModel.findOne({ phone: userData.phone }).lean();
        if (user) syncUserIds.add(String(user._id));
      }
    }

    // 标记不在列表中的成员为 inactive（实际使用 leave 状态）
    for (const member of activeMembers) {
      if (!syncUserIds.has(String(member.userId))) {
        await MongoTeamMemberModel.updateOne(
          { _id: member._id },
          { status: TeamMemberStatusEnum.leave }
        );
      }
    }
  }

  return {
    created,
    updated,
    skipped,
    errors
  };
}

export default NextAPI(handler);
