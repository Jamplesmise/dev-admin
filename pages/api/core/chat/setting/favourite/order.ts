// 调整收藏应用顺序
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { updateFavouriteOrder } from '@fastgpt/service/core/chat/favourite/controller';
import type { UpdateFavouriteOrderBody } from '@fastgpt/global/core/chat/setting/type';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<UpdateFavouriteOrderBody>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  // 从 header 获取认证信息
  const teamId = req.headers['x-team-id'] as string;
  const tmbId = req.headers['x-tmb-id'] as string;

  if (!teamId || !tmbId) {
    throw new Error('缺少认证信息');
  }

  const { favouriteId, targetOrder } = req.body;

  if (!favouriteId) {
    throw new Error('favouriteId 不能为空');
  }

  if (targetOrder === undefined || targetOrder < 0) {
    throw new Error('targetOrder 无效');
  }

  await updateFavouriteOrder({
    teamId,
    tmbId,
    favouriteId,
    targetOrder
  });

  return { success: true };
}

export default NextAPI(handler);
