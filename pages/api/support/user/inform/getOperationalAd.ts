import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { getOperationalAds } from '@fastgpt/service/support/advertisement/controller';
import type { GetOperationalAdResponse } from '@fastgpt/global/support/advertisement/type';
import { optionalAuthMiddleware } from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [optionalAuthMiddleware] });

type GetAdQuery = {
  position?: string;
  userType?: 'all' | 'free' | 'paid';
  platform?: 'web' | 'mobile' | 'all';
};

async function handler(
  req: ApiRequestProps<unknown, GetAdQuery>,
  _res: NextApiResponse
): Promise<GetOperationalAdResponse> {
  const { position, userType = 'all', platform = 'web' } = req.query;

  const ads = await getOperationalAds({
    position,
    userType,
    platform
  });

  return ads;
}

export default NextAPI(handler);
