/**
 * 调试接口 - 检查服务配置
 *
 * 注意：生产环境应该删除此接口！
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = {
    // 环境变量配置状态（不显示敏感值）
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TEST_MODE: process.env.TEST_MODE,
      REDIS_URL: process.env.REDIS_URL ? `${process.env.REDIS_URL.substring(0, 20)}...` : 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? `${process.env.MONGODB_URI.substring(0, 30)}...` : 'NOT SET',
      TOKEN_KEY: process.env.TOKEN_KEY ? 'SET (hidden)' : 'NOT SET',
    },
    // 请求头信息
    headers: {
      cookie: req.headers.cookie ? `${req.headers.cookie.substring(0, 50)}...` : 'empty',
      token: req.headers.token || 'empty',
      authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 30)}...` : 'empty',
      host: req.headers.host,
      'user-agent': req.headers['user-agent']?.substring(0, 50),
    },
    // 服务信息
    server: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  };

  res.status(200).json({
    code: 200,
    message: 'Debug config',
    data: config
  });
}
