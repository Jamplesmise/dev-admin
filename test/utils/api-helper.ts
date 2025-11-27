/**
 * API 测试辅助工具
 * 用于通过 HTTP 调用 API 进行集成测试
 */
import { createServer, Server } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import listen from 'test-listen';

// 测试数据库配置
export const TEST_DB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/fastgpt-test';

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = TEST_DB_URI;

/**
 * 创建测试服务器
 * 将 Next.js API handler 包装为 HTTP 服务器
 */
export async function createTestServer(handler: any): Promise<{ server: Server; url: string }> {
  const server = createServer((req: any, res: any) => {
    // 将 HTTP 请求转换为 Next.js API 请求格式
    const apiReq = req as NextApiRequest;
    const apiRes = res as NextApiResponse;

    // 添加 Next.js API Response 兼容方法
    if (!apiRes.status) {
      apiRes.status = function (code: number) {
        res.statusCode = code;
        return apiRes;
      };
    }
    if (!apiRes.json) {
      apiRes.json = function (data: any) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return apiRes;
      };
    }

    // 设置 query 参数（从 URL 解析）
    const url = new URL(req.url!, `http://${req.headers.host}`);
    apiReq.query = Object.fromEntries(url.searchParams.entries());
    apiReq.body = '';

    // 解析 body
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          apiReq.body = body ? JSON.parse(body) : {};
        } catch (e) {
          apiReq.body = body;
        }

        // 直接调用 handler（不使用 apiResolver）
        try {
          const result = await handler(apiReq, apiRes);
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          }
        } catch (error: any) {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                message: error.message || 'Internal Server Error',
                error: error.toString()
              })
            );
          }
        }
      });
    } else {
      // GET 请求
      (async () => {
        try {
          const result = await handler(apiReq, apiRes);
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          }
        } catch (error: any) {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                message: error.message || 'Internal Server Error',
                error: error.toString()
              })
            );
          }
        }
      })();
    }
  });

  const url = await listen(server);
  return { server, url };
}

/**
 * 关闭测试服务器
 */
export async function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 创建测试用户的认证 headers
 */
export interface TestAuthContext {
  userId: string;
  teamId: string;
  tmbId?: string;
  isRoot?: boolean;
}

export function createAuthHeaders(auth: TestAuthContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-user-id': auth.userId,
    'x-team-id': auth.teamId,
    'content-type': 'application/json'
  };

  if (auth.tmbId) {
    headers['x-tmb-id'] = auth.tmbId;
  }

  if (auth.isRoot) {
    headers['x-is-root'] = 'true';
  }

  return headers;
}

/**
 * 创建默认测试用户
 * 使用真实的 MongoDB ObjectId
 */
export function createDefaultTestAuth(): TestAuthContext {
  const { Types } = require('mongoose');
  return {
    userId: new Types.ObjectId().toString(),
    teamId: new Types.ObjectId().toString(),
    tmbId: new Types.ObjectId().toString()
  };
}

/**
 * 创建管理员测试用户
 * 使用真实的 MongoDB ObjectId
 */
export function createAdminTestAuth(): TestAuthContext {
  const { Types } = require('mongoose');
  return {
    userId: new Types.ObjectId().toString(),
    teamId: new Types.ObjectId().toString(),
    tmbId: new Types.ObjectId().toString(),
    isRoot: true
  };
}

/**
 * 辅助函数：等待一段时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
