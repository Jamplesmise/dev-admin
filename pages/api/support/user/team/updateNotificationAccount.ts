import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 请求体类型
 */
type RequestBody = {
  emailNotification?: {
    enabled: boolean;
    email: string;
  };
  smsNotification?: {
    enabled: boolean;
    phone: string;
  };
  webhookNotification?: {
    enabled: boolean;
    url: string;
    secret?: string;
  };
};

/**
 * 验证邮箱格式
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式（中国大陆）
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证当前用户权限（只有 owner 或有管理权限的用户可以更新通知设置）
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
 * 更新通知账户 API
 * PUT /api/support/user/team/updateNotificationAccount
 */
async function handler(
  req: ApiRequestProps<RequestBody>,
  _res: NextApiResponse
): Promise<void> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { emailNotification, smsNotification, webhookNotification } = req.body;

  // 权限验证
  const hasPermission = await validatePermission(teamId, tmbId);
  if (!hasPermission) {
    return Promise.reject('权限不足，只有团队管理员可以更新通知设置');
  }

  // 验证邮箱通知
  if (emailNotification) {
    if (emailNotification.enabled && !emailNotification.email) {
      return Promise.reject('启用邮箱通知时必须提供邮箱地址');
    }
    if (emailNotification.email && !isValidEmail(emailNotification.email)) {
      return Promise.reject('邮箱格式无效');
    }
  }

  // 验证短信通知
  if (smsNotification) {
    if (smsNotification.enabled && !smsNotification.phone) {
      return Promise.reject('启用短信通知时必须提供手机号');
    }
    if (smsNotification.phone && !isValidPhone(smsNotification.phone)) {
      return Promise.reject('手机号格式无效');
    }
  }

  // 验证 Webhook 通知
  if (webhookNotification) {
    if (webhookNotification.enabled && !webhookNotification.url) {
      return Promise.reject('启用 Webhook 通知时必须提供 URL');
    }
    if (webhookNotification.url && !isValidUrl(webhookNotification.url)) {
      return Promise.reject('Webhook URL 格式无效');
    }
  }

  // 构建通知账户字符串（为了向后兼容）
  // 格式: 类型:值|类型:值...
  const notificationParts: string[] = [];

  if (emailNotification?.enabled && emailNotification.email) {
    notificationParts.push(`email:${emailNotification.email}`);
  }
  if (smsNotification?.enabled && smsNotification.phone) {
    notificationParts.push(`sms:${smsNotification.phone}`);
  }
  if (webhookNotification?.enabled && webhookNotification.url) {
    const webhookValue = webhookNotification.secret
      ? `${webhookNotification.url}#${webhookNotification.secret}`
      : webhookNotification.url;
    notificationParts.push(`webhook:${webhookValue}`);
  }

  const notificationAccount = notificationParts.length > 0 ? notificationParts.join('|') : '';

  // 更新团队通知账户
  await MongoTeamModel.updateOne(
    { _id: teamId },
    { notificationAccount }
  );
}

export default NextAPI(handler);
