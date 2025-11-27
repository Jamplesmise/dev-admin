// 收藏应用控制器

import { MongoFavouriteAppModel } from './schema';
import type {
  FavouriteAppSchemaType,
  FavouriteAppListItemType,
  UpdateFavouriteAppBody
} from '../../../../global/core/chat/setting/type';
import { TAG_MAX_LENGTH, CUSTOM_NAME_MAX_LENGTH } from '../../../../global/core/chat/setting/constant';

/**
 * 获取收藏应用列表
 */
export const getFavouriteAppList = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}): Promise<FavouriteAppListItemType[]> => {
  // 先查询收藏列表（不使用 populate，避免 model 未注册问题）
  const favourites = await MongoFavouriteAppModel.find({
    teamId,
    tmbId
  })
    .sort({ order: 1, createTime: -1 })
    .lean();

  return favourites.map((fav) => {
    return {
      _id: String(fav._id),
      tmbId: String(fav.tmbId),
      teamId: String(fav.teamId),
      appId: String(fav.appId),
      order: fav.order,
      tags: fav.tags || [],
      customName: fav.customName,
      customIcon: fav.customIcon,
      createTime: fav.createTime,
      // app 信息由前端单独获取或后续扩展
      app: undefined
    };
  });
};

/**
 * 添加或更新收藏
 */
export const upsertFavouriteApp = async ({
  teamId,
  tmbId,
  data
}: {
  teamId: string;
  tmbId: string;
  data: UpdateFavouriteAppBody;
}): Promise<FavouriteAppSchemaType> => {
  const { appId, customName, customIcon, tags } = data;

  // 验证标签长度
  if (tags) {
    for (const tag of tags) {
      if (tag.length > TAG_MAX_LENGTH) {
        throw new Error(`标签长度不能超过 ${TAG_MAX_LENGTH} 个字符`);
      }
    }
  }

  // 验证自定义名称长度
  if (customName && customName.length > CUSTOM_NAME_MAX_LENGTH) {
    throw new Error(`自定义名称长度不能超过 ${CUSTOM_NAME_MAX_LENGTH} 个字符`);
  }

  // 检查是否已存在
  const existing = await MongoFavouriteAppModel.findOne({
    teamId,
    tmbId,
    appId
  });

  if (existing) {
    // 更新
    const updated = await MongoFavouriteAppModel.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          customName,
          customIcon,
          tags: tags || existing.tags
        }
      },
      { new: true, lean: true }
    );

    if (!updated) {
      throw new Error('更新收藏失败');
    }

    return updated as FavouriteAppSchemaType;
  } else {
    // 新增：获取最大 order 值
    const maxOrderDoc = await MongoFavouriteAppModel.findOne({
      teamId,
      tmbId
    })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const newOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

    const created = await MongoFavouriteAppModel.create({
      teamId,
      tmbId,
      appId,
      order: newOrder,
      customName,
      customIcon,
      tags: tags || []
    });

    return created.toObject() as FavouriteAppSchemaType;
  }
};

/**
 * 调整收藏顺序
 */
export const updateFavouriteOrder = async ({
  teamId,
  tmbId,
  favouriteId,
  targetOrder
}: {
  teamId: string;
  tmbId: string;
  favouriteId: string;
  targetOrder: number;
}): Promise<void> => {
  // 获取当前收藏
  const favourite = await MongoFavouriteAppModel.findOne({
    _id: favouriteId,
    teamId,
    tmbId
  });

  if (!favourite) {
    throw new Error('收藏不存在');
  }

  const currentOrder = favourite.order;

  if (currentOrder === targetOrder) {
    return; // 无需调整
  }

  // 调整其他收藏的顺序
  if (currentOrder < targetOrder) {
    // 向后移动：中间的收藏 order -1
    await MongoFavouriteAppModel.updateMany(
      {
        teamId,
        tmbId,
        order: { $gt: currentOrder, $lte: targetOrder }
      },
      { $inc: { order: -1 } }
    );
  } else {
    // 向前移动：中间的收藏 order +1
    await MongoFavouriteAppModel.updateMany(
      {
        teamId,
        tmbId,
        order: { $gte: targetOrder, $lt: currentOrder }
      },
      { $inc: { order: 1 } }
    );
  }

  // 更新目标收藏的顺序
  await MongoFavouriteAppModel.updateOne(
    { _id: favouriteId },
    { $set: { order: targetOrder } }
  );
};

/**
 * 更新收藏标签
 */
export const updateFavouriteTags = async ({
  teamId,
  tmbId,
  favouriteId,
  tags
}: {
  teamId: string;
  tmbId: string;
  favouriteId: string;
  tags: string[];
}): Promise<FavouriteAppSchemaType> => {
  // 验证标签长度
  for (const tag of tags) {
    if (tag.length > TAG_MAX_LENGTH) {
      throw new Error(`标签长度不能超过 ${TAG_MAX_LENGTH} 个字符`);
    }
  }

  const updated = await MongoFavouriteAppModel.findOneAndUpdate(
    { _id: favouriteId, teamId, tmbId },
    { $set: { tags } },
    { new: true, lean: true }
  );

  if (!updated) {
    throw new Error('收藏不存在');
  }

  return updated as FavouriteAppSchemaType;
};

/**
 * 删除收藏
 */
export const deleteFavouriteApp = async ({
  teamId,
  tmbId,
  favouriteId
}: {
  teamId: string;
  tmbId: string;
  favouriteId: string;
}): Promise<void> => {
  const result = await MongoFavouriteAppModel.deleteOne({
    _id: favouriteId,
    teamId,
    tmbId
  });

  if (result.deletedCount === 0) {
    throw new Error('收藏不存在');
  }
};

/**
 * 删除用户所有收藏（用于清理数据）
 */
export const deleteAllFavourites = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}): Promise<void> => {
  await MongoFavouriteAppModel.deleteMany({ teamId, tmbId });
};
