// 添加或更新收藏应用
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { upsertFavouriteApp } from '@fastgpt/service/core/chat/favourite/controller';
import type {
  FavouriteAppSchemaType,
  UpdateFavouriteAppBody
} from '@fastgpt/global/core/chat/setting/type';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<UpdateFavouriteAppBody>,
  _res: NextApiResponse
): Promise<FavouriteAppSchemaType> {
  // 从 header 获取认证信息
  const teamId = req.headers['x-team-id'] as string;
  const tmbId = req.headers['x-tmb-id'] as string;

  if (!teamId || !tmbId) {
    throw new Error('缺少认证信息');
  }

  const { appId, customName, customIcon, tags } = req.body;

  if (!appId) {
    throw new Error('appId 不能为空');
  }

  const favourite = await upsertFavouriteApp({
    teamId,
    tmbId,
    data: { appId, customName, customIcon, tags }
  });

  return favourite;
}

export default NextAPI(handler);
