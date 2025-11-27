import type { NextApiRequest, NextApiResponse } from 'next';
import type { JwtPayloadType } from '../../global/support_user/type';

// 认证上下文类型
export type AuthContext = {
  userId: string;
  teamId?: string;
  tmbId?: string;
  isRoot?: boolean;
};

export type ApiRequestProps<Body = unknown, Query = Record<string, string | string[] | undefined>> = Omit<NextApiRequest, 'query' | 'body'> & {
  query: Query;
  body: Body;
  // 认证后注入的用户信息
  auth?: AuthContext;
};

export type { NextApiResponse as ApiResponseType } from 'next';
