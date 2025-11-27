/**
 * API 测试工具
 * 使用 node-mocks-http 模拟 Next.js API 请求
 */
import { createMocks, RequestOptions, MockResponse } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 认证信息类型
 */
export interface AuthHeaders {
  teamId: string;
  tmbId?: string;
  userId?: string;
  isRoot?: boolean;
}

/**
 * API 测试请求选项
 */
export interface ApiTestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  query?: Record<string, string | string[]>;
  auth?: AuthHeaders;
  headers?: Record<string, string>;
  /**
   * 跳过 TEST_MODE 的自动认证模拟
   * 设为 true 时，即使在 TEST_MODE 下也会执行真实的认证逻辑
   * 用于测试"未登录用户被拒绝"等认证失败场景
   */
  skipAuthMock?: boolean;
}

/**
 * API 响应结果类型
 */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: {
    code: number;
    statusText?: string;
    message?: string;
    data: T;
  };
}

/**
 * 创建带认证的 API 测试请求
 *
 * @param handler - Next.js API handler
 * @param options - 请求选项
 * @returns 响应结果
 *
 * @example
 * ```ts
 * const response = await callApi(handler, {
 *   method: 'POST',
 *   auth: { teamId, tmbId },
 *   body: { name: '测试分组' }
 * });
 * expect(response.body.code).toBe(200);
 * ```
 */
export async function callApi<T = unknown>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: ApiTestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, query, auth, headers = {}, skipAuthMock = false } = options;

  // 构建请求头
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // 如果需要测试认证失败场景，添加标记头
  if (skipAuthMock) {
    requestHeaders['x-test-skip-auth-mock'] = 'true';
  }

  // 添加认证 headers
  if (auth) {
    requestHeaders['x-team-id'] = auth.teamId;
    if (auth.tmbId) requestHeaders['x-tmb-id'] = auth.tmbId;
    if (auth.userId) requestHeaders['x-user-id'] = auth.userId;
    if (auth.isRoot) requestHeaders['x-is-root'] = 'true';
  }

  // 构建请求配置
  const requestOptions: RequestOptions = {
    method,
    headers: requestHeaders,
    query,
    body
  };

  // 创建 mock request/response
  const { req, res } = createMocks(requestOptions);

  // 设置 req.auth 用于需要认证的 API
  // 这模拟了认证中间件的行为
  if (auth) {
    (req as unknown as Record<string, unknown>).auth = {
      teamId: auth.teamId,
      tmbId: auth.tmbId || '',
      userId: auth.userId || '',
      isRoot: auth.isRoot || false
    };
  }

  // 调用 handler
  await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

  // 获取响应
  const mockRes = res as MockResponse<NextApiResponse>;
  const responseData = mockRes._getData();

  // 解析响应数据
  let parsedBody: ApiResponse<T>['body'];
  try {
    parsedBody = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
  } catch {
    parsedBody = { code: mockRes._getStatusCode(), data: responseData as T };
  }

  return {
    statusCode: mockRes._getStatusCode(),
    body: parsedBody
  };
}

/**
 * 期望成功响应
 */
export function expectSuccess<T>(response: ApiResponse<T>): T {
  expect(response.body.code).toBe(200);
  return response.body.data;
}

/**
 * 期望错误响应
 */
export function expectError(response: ApiResponse, expectedCode?: number): void {
  expect(response.body.code).not.toBe(200);
  if (expectedCode) {
    expect(response.body.code).toBe(expectedCode);
  }
}

/**
 * 创建完整的测试上下文
 * 包含 team, user, teamMember 的创建
 */
export async function createTestContext(testDataFactory: {
  createUser: (data: { username: string }) => Promise<{ _id: { toString(): string } }>;
  createTeam: (data: { name: string }) => Promise<{ _id: { toString(): string } }>;
  createTeamMember: (data: {
    teamId: string;
    userId: string;
    name: string;
  }) => Promise<{ _id: { toString(): string } }>;
}) {
  const user = await testDataFactory.createUser({ username: `测试用户-${Date.now()}` });
  const team = await testDataFactory.createTeam({ name: `测试团队-${Date.now()}` });
  const member = await testDataFactory.createTeamMember({
    teamId: team._id.toString(),
    userId: user._id.toString(),
    name: '测试成员'
  });

  return {
    userId: user._id.toString(),
    teamId: team._id.toString(),
    tmbId: member._id.toString(),
    auth: {
      teamId: team._id.toString(),
      tmbId: member._id.toString(),
      userId: user._id.toString()
    }
  };
}
