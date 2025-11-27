/**
 * 获取插件分组列表
 *
 * GET /api/core/app/plugin/getPluginGroups
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  // 返回空的插件分组列表
  // 这是一个占位接口，避免前端 404 错误
  return res.status(200).json({
    code: 200,
    statusText: '',
    message: '',
    data: []
  });
}
