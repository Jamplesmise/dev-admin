// 获取用户聊天设置详情
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { getOrCreateChatSetting } from '@fastgpt/service/core/chat/setting/controller';
import type { ChatSettingSchemaType } from '@fastgpt/global/core/chat/setting/type';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<ChatSettingSchemaType> {
  // 从 header 获取认证信息
  const teamId = req.headers['x-team-id'] as string;
  const tmbId = req.headers['x-tmb-id'] as string;

  if (!teamId || !tmbId) {
    throw new Error('缺少认证信息');
  }

  // 获取或创建设置
  const setting = await getOrCreateChatSetting({ teamId, tmbId });

  return setting;
}

export default NextAPI(handler);
