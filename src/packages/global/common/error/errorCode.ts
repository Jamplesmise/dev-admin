export const ERROR_CODE: { [key: number]: string } = {
  400: '请求参数错误',
  401: '未授权',
  403: '无权限访问',
  404: '资源不存在',
  405: '方法不允许',
  406: '不可接受',
  410: '资源已删除',
  422: '无法处理的请求',
  429: '请求过于频繁',
  500: '服务器错误',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时'
};

export const TOKEN_ERROR_CODE: Record<number, string> = {
  403: 'Token 无效或已过期'
};

export const proxyError: Record<string, boolean> = {
  ECONNABORTED: true,
  ECONNRESET: true
};

export enum ERROR_ENUM {
  unAuthorization = 'unAuthorization',
  insufficientQuota = 'insufficientQuota',
  unAuthModel = 'unAuthModel',
  unAuthApiKey = 'unAuthApiKey',
  unAuthFile = 'unAuthFile',
  tooManyRequest = 'tooManyRequest'
}

export type ErrType<T> = Record<
  string,
  {
    code: number;
    statusText: T;
    message: string;
    data: null;
  }
>;

export const ERROR_RESPONSE: Record<
  ERROR_ENUM,
  {
    code: number;
    statusText: string;
    message: string;
    data: null;
  }
> = {
  [ERROR_ENUM.unAuthorization]: {
    code: 403,
    statusText: ERROR_ENUM.unAuthorization,
    message: '登录状态已过期，请重新登录',
    data: null
  },
  [ERROR_ENUM.tooManyRequest]: {
    code: 429,
    statusText: ERROR_ENUM.tooManyRequest,
    message: '请求过于频繁，请稍后再试',
    data: null
  },
  [ERROR_ENUM.insufficientQuota]: {
    code: 510,
    statusText: ERROR_ENUM.insufficientQuota,
    message: '额度不足',
    data: null
  },
  [ERROR_ENUM.unAuthModel]: {
    code: 511,
    statusText: ERROR_ENUM.unAuthModel,
    message: '无权使用该模型',
    data: null
  },
  [ERROR_ENUM.unAuthFile]: {
    code: 513,
    statusText: ERROR_ENUM.unAuthFile,
    message: '无权访问该文件',
    data: null
  },
  [ERROR_ENUM.unAuthApiKey]: {
    code: 514,
    statusText: ERROR_ENUM.unAuthApiKey,
    message: 'API Key 无效',
    data: null
  }
};
