import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { getPromotionData } from '@fastgpt/service/support/promotion/controller';
import type { GetPromotionDataResponse } from '@fastgpt/global/support/promotion/type';
import {
  authMiddleware,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<GetPromotionDataResponse> {
  const userId = getUserIdFromReq(req);

  if (!userId) {
    throw new Error('用户未登录');
  }

  const data = await getPromotionData(userId);

  return data;
}

export default NextAPI(handler);
