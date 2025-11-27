import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { createWorkOrder } from '@fastgpt/service/support/workorder/controller';
import type {
  CreateWorkOrderBody,
  CreateWorkOrderResponse
} from '@fastgpt/global/support/workorder/type';
import {
  optionalAuthMiddleware,
  getAuthFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [optionalAuthMiddleware] });

async function handler(
  req: ApiRequestProps<CreateWorkOrderBody>,
  _res: NextApiResponse
): Promise<CreateWorkOrderResponse> {
  const { type, title, description, attachments, priority, contactEmail } = req.body;

  // 验证必填字段
  if (!type || !title || !description) {
    throw new Error('缺少必填字段: type, title, description');
  }

  // 获取用户信息（如果已登录）
  let userId: string | undefined;
  let teamId: string | undefined;
  const email = contactEmail;

  try {
    const auth = getAuthFromReq(req);
    userId = auth.userId;
    teamId = auth.teamId;
  } catch (e) {
    // 未登录,使用传入的 contactEmail
  }

  // 如果未提供联系邮箱,抛出错误
  if (!email) {
    throw new Error('请提供联系邮箱');
  }

  const result = await createWorkOrder({
    userId,
    teamId,
    contactEmail: email,
    type,
    title,
    description,
    attachments,
    priority
  });

  return result;
}

export default NextAPI(handler);
