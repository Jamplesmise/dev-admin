/**
 * 邀请链接 Controller
 * 处理邀请链接的业务逻辑
 */
import { MongoInvitationLinkModel, InvitationLinkStatusEnum } from './schema';
import type { InvitationLinkSchemaType } from './schema';

/**
 * 创建邀请链接
 */
export async function createInvitationLink(params: {
  teamId: string;
  creatorTmbId: string;
  maxUsage?: number;
  expireDays?: number;
  description?: string;
}): Promise<InvitationLinkSchemaType> {
  const { teamId, creatorTmbId, maxUsage = 0, expireDays = 7, description = '' } = params;

  // 默认7天后过期
  const finalExpireTime = expireTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const link = await MongoInvitationLinkModel.create({
    teamId,
    creatorTmbId,
    maxUsage,
    expireTime,
    description,
    status: InvitationLinkStatusEnum.active
  });

  // 转为普通对象，确保 linkId 是字符串
  return link.toObject() as InvitationLinkSchemaType;
}

/**
 * 获取团队邀请链接列表
 */
export async function getInvitationLinksByTeam(
  teamId: string
): Promise<InvitationLinkSchemaType[]> {
  const links = await MongoInvitationLinkModel.find({ teamId })
    .sort({ createTime: -1 })
    .lean();

  return links as unknown as InvitationLinkSchemaType[];
}

/**
 * 根据 linkId 获取邀请链接
 */
export async function getInvitationLinkByLinkId(
  linkId: string
): Promise<InvitationLinkSchemaType | null> {
  const link = await MongoInvitationLinkModel.findOne({ linkId }).lean();
  return link as unknown as InvitationLinkSchemaType | null;
}

/**
 * 验证邀请链接是否有效
 */
export function validateInvitationLink(
  link: InvitationLinkSchemaType
): { valid: boolean; reason?: string } {
  // 检查是否已禁用
  if (link.status === InvitationLinkStatusEnum.disabled) {
    return { valid: false, reason: '该邀请链接已被禁用' };
  }

  // 检查是否过期
  if (new Date(link.expireTime) < new Date()) {
    return { valid: false, reason: '该邀请链接已过期' };
  }

  // 检查使用次数
  if (link.maxUsage > 0 && link.usedCount >= link.maxUsage) {
    return { valid: false, reason: '该邀请链接已达使用上限' };
  }

  return { valid: true };
}

/**
 * 增加邀请链接使用次数
 */
export async function incrementInvitationLinkUsage(
  linkId: string
): Promise<void> {
  await MongoInvitationLinkModel.updateOne(
    { linkId },
    { $inc: { usedCount: 1 } }
  );
}

/**
 * 禁用/启用邀请链接
 */
export async function setInvitationLinkStatus(
  linkId: string,
  forbid: boolean
): Promise<void> {
  await MongoInvitationLinkModel.updateOne(
    { linkId },
    {
      status: forbid
        ? InvitationLinkStatusEnum.disabled
        : InvitationLinkStatusEnum.active
    }
  );
}
