// 聊天设置控制器

import { MongoChatSettingModel } from './schema';
import type {
  ChatSettingSchemaType,
  UpdateChatSettingBody
} from '../../../../global/core/chat/setting/type';
import { DEFAULT_CHAT_SETTING } from '../../../../global/core/chat/setting/constant';

/**
 * 获取用户聊天设置
 * 如果不存在则返回 null
 */
export const getChatSettingByTmbId = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}): Promise<ChatSettingSchemaType | null> => {
  const setting = await MongoChatSettingModel.findOne({
    teamId,
    tmbId
  }).lean();

  return setting;
};

/**
 * 获取或创建用户聊天设置
 * 如果不存在则创建默认设置
 */
export const getOrCreateChatSetting = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}): Promise<ChatSettingSchemaType> => {
  let setting = await getChatSettingByTmbId({ teamId, tmbId });

  if (!setting) {
    const created = await MongoChatSettingModel.create({
      teamId,
      tmbId,
      homeEnabled: DEFAULT_CHAT_SETTING.homeEnabled,
      homeWelcome: DEFAULT_CHAT_SETTING.homeWelcome,
      sidebarCollapsed: DEFAULT_CHAT_SETTING.sidebarCollapsed,
      preferences: {
        theme: DEFAULT_CHAT_SETTING.theme,
        fontSize: DEFAULT_CHAT_SETTING.fontSize,
        codeTheme: DEFAULT_CHAT_SETTING.codeTheme
      }
    });
    setting = created.toObject() as ChatSettingSchemaType;
  }

  return setting;
};

/**
 * 更新用户聊天设置
 */
export const updateChatSetting = async ({
  teamId,
  tmbId,
  updateData
}: {
  teamId: string;
  tmbId: string;
  updateData: UpdateChatSettingBody;
}): Promise<ChatSettingSchemaType> => {
  // 构建更新对象
  const updateObj: Record<string, unknown> = {};

  if (updateData.homeEnabled !== undefined) {
    updateObj.homeEnabled = updateData.homeEnabled;
  }
  if (updateData.homeWelcome !== undefined) {
    updateObj.homeWelcome = updateData.homeWelcome;
  }
  if (updateData.homeBackground !== undefined) {
    updateObj.homeBackground = updateData.homeBackground;
  }
  if (updateData.defaultAppId !== undefined) {
    updateObj.defaultAppId = updateData.defaultAppId;
  }
  if (updateData.sidebarCollapsed !== undefined) {
    updateObj.sidebarCollapsed = updateData.sidebarCollapsed;
  }

  // 处理偏好设置的部分更新
  if (updateData.preferences) {
    if (updateData.preferences.theme !== undefined) {
      updateObj['preferences.theme'] = updateData.preferences.theme;
    }
    if (updateData.preferences.fontSize !== undefined) {
      updateObj['preferences.fontSize'] = updateData.preferences.fontSize;
    }
    if (updateData.preferences.codeTheme !== undefined) {
      updateObj['preferences.codeTheme'] = updateData.preferences.codeTheme;
    }
  }

  // 构建 $setOnInsert 对象（只包含不在 updateObj 中的默认值）
  const setOnInsertObj: Record<string, unknown> = {};

  if (updateObj.homeEnabled === undefined) {
    setOnInsertObj.homeEnabled = DEFAULT_CHAT_SETTING.homeEnabled;
  }
  if (updateObj.homeWelcome === undefined) {
    setOnInsertObj.homeWelcome = DEFAULT_CHAT_SETTING.homeWelcome;
  }
  if (updateObj.sidebarCollapsed === undefined) {
    setOnInsertObj.sidebarCollapsed = DEFAULT_CHAT_SETTING.sidebarCollapsed;
  }
  // preferences 需要特殊处理：如果没有任何 preferences 更新，则设置整个默认对象
  if (
    updateObj['preferences.theme'] === undefined &&
    updateObj['preferences.fontSize'] === undefined &&
    updateObj['preferences.codeTheme'] === undefined
  ) {
    setOnInsertObj.preferences = {
      theme: DEFAULT_CHAT_SETTING.theme,
      fontSize: DEFAULT_CHAT_SETTING.fontSize,
      codeTheme: DEFAULT_CHAT_SETTING.codeTheme
    };
  }

  // upsert: 如果不存在则创建
  const updateQuery: Record<string, unknown> = { $set: updateObj };
  if (Object.keys(setOnInsertObj).length > 0) {
    updateQuery.$setOnInsert = setOnInsertObj;
  }

  const result = await MongoChatSettingModel.findOneAndUpdate(
    { teamId, tmbId },
    updateQuery,
    {
      new: true,
      upsert: true,
      lean: true
    }
  );

  return result as ChatSettingSchemaType;
};

/**
 * 删除用户聊天设置（用于清理数据）
 */
export const deleteChatSetting = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}): Promise<void> => {
  await MongoChatSettingModel.deleteOne({ teamId, tmbId });
};
