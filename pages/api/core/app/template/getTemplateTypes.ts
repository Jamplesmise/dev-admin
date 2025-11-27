import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 应用模板类型定义
type TemplateType = {
  key: string;
  label: string;
  icon?: string;
  description?: string;
  order: number;
};

type ResponseType = {
  list: TemplateType[];
};

// 预定义的模板类型列表
const TEMPLATE_TYPES: TemplateType[] = [
  {
    key: 'all',
    label: '全部',
    icon: 'all',
    description: '所有模板类型',
    order: 0
  },
  {
    key: 'office',
    label: '办公',
    icon: 'office',
    description: '办公场景模板',
    order: 1
  },
  {
    key: 'writing',
    label: '写作',
    icon: 'writing',
    description: '写作助手模板',
    order: 2
  },
  {
    key: 'roleplay',
    label: '角色扮演',
    icon: 'roleplay',
    description: '角色扮演模板',
    order: 3
  },
  {
    key: 'knowledge',
    label: '知识库',
    icon: 'knowledge',
    description: '知识库问答模板',
    order: 4
  },
  {
    key: 'workflow',
    label: '工作流',
    icon: 'workflow',
    description: '工作流自动化模板',
    order: 5
  },
  {
    key: 'plugin',
    label: '插件',
    icon: 'plugin',
    description: '插件应用模板',
    order: 6
  },
  {
    key: 'tool',
    label: '工具',
    icon: 'tool',
    description: '实用工具模板',
    order: 7
  },
  {
    key: 'education',
    label: '教育',
    icon: 'education',
    description: '教育场景模板',
    order: 8
  },
  {
    key: 'customer_service',
    label: '客服',
    icon: 'customer_service',
    description: '客服场景模板',
    order: 9
  },
  {
    key: 'other',
    label: '其他',
    icon: 'other',
    description: '其他类型模板',
    order: 99
  }
];

/**
 * 模板类型列表 API
 * GET /api/core/app/template/getTemplateTypes
 */
async function handler(
  _req: ApiRequestProps,
  _res: NextApiResponse
): Promise<ResponseType> {
  // 返回按 order 排序的模板类型列表
  const sortedList = [...TEMPLATE_TYPES].sort((a, b) => a.order - b.order);

  return {
    list: sortedList
  };
}

export default NextAPI(handler);
