// 获取收藏应用列表
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { getFavouriteAppList } from '@fastgpt/service/core/chat/favourite/controller';
import type { FavouriteAppListItemType } from '@fastgpt/global/core/chat/setting/type';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<FavouriteAppListItemType[]> {
  // 从 header 获取认证信息
  const teamId = req.headers['x-team-id'] as string;
  const tmbId = req.headers['x-tmb-id'] as string;

  if (!teamId || !tmbId) {
    throw new Error('缺少认证信息');
  }

  const favourites = await getFavouriteAppList({ teamId, tmbId });

  return favourites;
}

export default NextAPI(handler);
