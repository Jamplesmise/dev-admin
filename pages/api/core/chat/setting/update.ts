// 更新用户聊天设置
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { updateChatSetting } from '@fastgpt/service/core/chat/setting/controller';
import type {
  ChatSettingSchemaType,
  UpdateChatSettingBody
} from '@fastgpt/global/core/chat/setting/type';
import {
  HOME_WELCOME_MAX_LENGTH,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  ThemeEnum
} from '@fastgpt/global/core/chat/setting/constant';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<UpdateChatSettingBody>,
  _res: NextApiResponse
): Promise<ChatSettingSchemaType> {
  // 从 header 获取认证信息
  const teamId = req.headers['x-team-id'] as string;
  const tmbId = req.headers['x-tmb-id'] as string;

  if (!teamId || !tmbId) {
    throw new Error('缺少认证信息');
  }

  const {
    homeEnabled,
    homeWelcome,
    homeBackground,
    defaultAppId,
    sidebarCollapsed,
    preferences
  } = req.body;

  // 参数验证
  if (homeWelcome !== undefined && homeWelcome.length > HOME_WELCOME_MAX_LENGTH) {
    throw new Error(`欢迎语长度不能超过 ${HOME_WELCOME_MAX_LENGTH} 个字符`);
  }

  if (preferences?.fontSize !== undefined) {
    if (preferences.fontSize < FONT_SIZE_MIN || preferences.fontSize > FONT_SIZE_MAX) {
      throw new Error(`字体大小必须在 ${FONT_SIZE_MIN}-${FONT_SIZE_MAX} 之间`);
    }
  }

  if (preferences?.theme !== undefined) {
    if (!Object.values(ThemeEnum).includes(preferences.theme as ThemeEnum)) {
      throw new Error('无效的主题设置');
    }
  }

  // 更新设置
  const setting = await updateChatSetting({
    teamId,
    tmbId,
    updateData: {
      homeEnabled,
      homeWelcome,
      homeBackground,
      defaultAppId,
      sidebarCollapsed,
      preferences
    }
  });

  return setting;
}

export default NextAPI(handler);
