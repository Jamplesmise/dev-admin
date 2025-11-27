// 更新收藏应用标签
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { updateFavouriteTags } from '@fastgpt/service/core/chat/favourite/controller';
import type {
  FavouriteAppSchemaType,
  UpdateFavouriteTagsBody
} from '@fastgpt/global/core/chat/setting/type';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MAX_TAGS_COUNT } from '@fastgpt/global/core/chat/setting/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<UpdateFavouriteTagsBody>,
  _res: NextApiResponse
): Promise<FavouriteAppSchemaType> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  const { favouriteId, tags } = req.body;

  if (!favouriteId) {
    throw new Error('favouriteId 不能为空');
  }

  if (!Array.isArray(tags)) {
    throw new Error('tags 必须是数组');
  }

  // 验证标签数量
  if (tags.length > MAX_TAGS_COUNT) {
    throw new Error(`标签数量不能超过 ${MAX_TAGS_COUNT} 个`);
  }

  const favourite = await updateFavouriteTags({
    teamId,
    tmbId,
    favouriteId,
    tags
  });

  return favourite;
}

export default NextAPI(handler);
