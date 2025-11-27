import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { MongoPromotionRecord } from '@fastgpt/service/support/promotion/schema';
import { PromotionStatusEnum } from '@fastgpt/global/support/promotion/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type RequestQuery = {
  page?: string;
  pageSize?: string;
  status?: string;
  promoterId?: string;
  startDate?: string;
  endDate?: string;
};

type PromotionRecordItem = {
  _id: string;
  promoterId: string;
  promotionCode: string;
  inviteeId: string;
  status: `${PromotionStatusEnum}`;
  reward: number;
  rewardPaidAt?: string;
  registerTime: string;
  validTime?: string;
  createTime: string;
};

type ResponseType = {
  list: PromotionRecordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * 验证管理员权限
 */
async function validateAdminPermission(
  teamId: string,
  tmbId: string
): Promise<{ hasPermission: boolean; reason?: string }> {
  try {
    const member = await MongoTeamMemberModel.findById(tmbId).lean();

    if (!member) {
      return { hasPermission: false, reason: '成员不存在' };
    }

    // owner 直接有权限
    if (member.role === TeamMemberRoleEnum.owner) {
      return { hasPermission: true };
    }

    // 其他角色检查协作者权限
    const { getTeamMemberPermission } = await import('@fastgpt/service/support_permission/controller');
    const permission = await getTeamMemberPermission({
      teamId,
      tmbId,
      role: member.role as `${TeamMemberRoleEnum}`
    });

    if (!permission.hasManagePer) {
      return { hasPermission: false, reason: '权限不足，只有管理员可以查看推广记录' };
    }

    return { hasPermission: true };
  } catch {
    return { hasPermission: false, reason: '权限验证失败' };
  }
}

/**
 * 推广记录列表 API
 * GET /api/support/activity/promotion/getPromotions
 */
async function handler(
  req: ApiRequestProps<object, RequestQuery>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { page = '1', pageSize = '20', status, promoterId, startDate, endDate } = req.query;

  // 验证管理员权限
  const permissionResult = await validateAdminPermission(teamId, tmbId);
  if (!permissionResult.hasPermission) {
    return Promise.reject(permissionResult.reason || '权限不足');
  }

  // 解析分页参数
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  // 构建查询条件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  // 按状态筛选
  if (status && Object.values(PromotionStatusEnum).includes(status as PromotionStatusEnum)) {
    query.status = status;
  }

  // 按推广人筛选
  if (promoterId) {
    query.promoterId = promoterId;
  }

  // 按日期范围筛选
  if (startDate || endDate) {
    query.createTime = {};
    if (startDate) {
      query.createTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createTime.$lte = new Date(endDate);
    }
  }

  // 查询数据
  const [records, total] = await Promise.all([
    MongoPromotionRecord.find(query)
      .sort({ createTime: -1 })
      .skip(skip)
      .limit(pageSizeNum)
      .lean(),
    MongoPromotionRecord.countDocuments(query)
  ]);

  // 格式化响应数据
  const list: PromotionRecordItem[] = records.map((record) => ({
    _id: String(record._id),
    promoterId: String(record.promoterId),
    promotionCode: record.promotionCode,
    inviteeId: String(record.inviteeId),
    status: record.status,
    reward: record.reward,
    rewardPaidAt: record.rewardPaidAt ? record.rewardPaidAt.toISOString() : undefined,
    registerTime: record.registerTime.toISOString(),
    validTime: record.validTime ? record.validTime.toISOString() : undefined,
    createTime: record.createTime.toISOString()
  }));

  return {
    list,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(total / pageSizeNum)
  };
}

export default NextAPI(handler);
