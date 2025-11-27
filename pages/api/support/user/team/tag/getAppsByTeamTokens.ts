import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { connectionMongo } from '@fastgpt/service/common/mongo';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type QueryType = {
  tokens?: string;
};

type AppItemType = {
  appId: string;
  appName: string;
  avatar: string;
  teamId: string;
};

/**
 * 令牌获取应用 API
 * GET /api/support/user/team/tag/getAppsByTeamTokens
 *
 * 根据令牌列表获取关联的应用信息
 * 令牌通常是应用的 API Key 或分享链接
 */
async function handler(
  req: ApiRequestProps<{}, QueryType>,
  _res: NextApiResponse
): Promise<AppItemType[]> {
  const teamId = getTeamIdFromReq(req);
  const { tokens } = req.query;

  // 如果没有提供 tokens，返回空列表
  if (!tokens || !tokens.trim()) {
    return [];
  }

  // 解析令牌列表
  const tokenList = tokens.split(',').map(t => t.trim()).filter(Boolean);

  if (tokenList.length === 0) {
    return [];
  }

  // 尝试获取 openapi_keys 集合
  // 这是 FastGPT 存储 API Key 的表
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return [];
    }

    const openapiKeysCollection = db.collection('openapi_keys');

    // 查询匹配的 API keys
    const keys = await openapiKeysCollection.find({
      teamId: connectionMongo.Types.ObjectId.createFromHexString(teamId),
      apiKey: { $in: tokenList }
    }).toArray();

    if (keys.length === 0) {
      return [];
    }

    // 获取关联的应用 ID
    const appIds = keys
      .filter(k => k.appId)
      .map(k => k.appId);

    if (appIds.length === 0) {
      return [];
    }

    // 查询应用信息
    const appsCollection = db.collection('apps');
    const apps = await appsCollection.find({
      _id: { $in: appIds }
    }).toArray();

    // 返回应用基本信息
    return apps.map(app => ({
      appId: String(app._id),
      appName: app.name || '',
      avatar: app.avatar || '',
      teamId: String(app.teamId)
    }));
  } catch {
    // 如果查询失败（可能是集合不存在），返回空列表
    return [];
  }
}

export default NextAPI(handler);
