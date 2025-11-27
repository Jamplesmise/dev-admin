/**
 * 创建评估任务
 *
 * POST /api/core/app/evaluation/create
 * Content-Type: multipart/form-data
 *
 * FormData:
 *   - file: CSV 文件 (评估数据)
 *   - data: JSON 字符串 { name, evalModel, appId }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { getUploadModel } from '@fastgpt/service/common/file/multer';
import { MongoEvaluationModel } from '@fastgpt/service/core/app/evaluation/schema';
import { MongoEvaluationItemModel } from '@fastgpt/service/core/app/evaluation/itemSchema';
import {
  EvaluationStatusEnum,
  EvaluationItemStatusEnum
} from '@fastgpt/global/core/app/evaluation/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

// 创建评估请求数据类型
type CreateEvalFormData = {
  name: string;
  evalModel: string;
  appId: string;
};

// 测试用例类型
type TestCase = {
  question: string;
  expectedResponse?: string;
  variables?: Record<string, string>;
  history?: Array<{ role: string; content: string }>;
};

// 禁用 Next.js 默认的 body parser，使用 multer 处理
export const config = {
  api: {
    bodyParser: false
  }
};

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });
const uploadModel = getUploadModel({ maxSize: 10 }); // 10MB

/**
 * 检测 CSV 分隔符（支持逗号和 Tab）
 */
function detectDelimiter(headerLine: string): string {
  // 如果包含 Tab，优先使用 Tab
  if (headerLine.includes('\t')) {
    return '\t';
  }
  return ',';
}

/**
 * 解析 CSV 文件内容
 * CSV 格式: *q,*a,history 或 带变量的格式
 * 支持逗号分隔和 Tab 分隔
 */
function parseCSVContent(content: string): TestCase[] {
  // 移除 BOM（字节顺序标记）
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }
  // 处理 UTF-8 BOM (EF BB BF)
  if (cleanContent.startsWith('\ufeff')) {
    cleanContent = cleanContent.slice(1);
  }

  const lines = cleanContent.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV 文件格式错误：至少需要包含表头和一行数据');
  }

  // 检测分隔符
  const delimiter = detectDelimiter(lines[0]);

  // 解析表头
  const headers = parseCSVLine(lines[0], delimiter);

  // 调试日志
  console.log('[CSV Parse] Raw header line:', JSON.stringify(lines[0]));
  console.log('[CSV Parse] Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
  console.log('[CSV Parse] Parsed headers:', headers);

  // 支持多种格式: *q, q, Q, *Q
  const qIndex = headers.findIndex((h) => {
    const normalized = h.toLowerCase().trim();
    return normalized === '*q' || normalized === 'q';
  });
  const aIndex = headers.findIndex((h) => {
    const normalized = h.toLowerCase().trim();
    return normalized === '*a' || normalized === 'a';
  });
  const historyIndex = headers.findIndex((h) => h.toLowerCase().trim() === 'history');

  console.log('[CSV Parse] Column indexes - q:', qIndex, ', a:', aIndex, ', history:', historyIndex);

  if (qIndex === -1) {
    throw new Error(`CSV 文件格式错误：缺少必需的 *q 或 q 列（问题列）。解析到的表头: [${headers.join(', ')}]`);
  }

  const testCases: TestCase[] = [];

  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const question = values[qIndex]?.trim();

    if (!question) continue;

    const testCase: TestCase = {
      question,
      expectedResponse: aIndex !== -1 ? values[aIndex]?.trim() : undefined,
      variables: {},
      history: []
    };

    // 解析变量列（非 q, a, history 的列）
    headers.forEach((header, idx) => {
      if (
        idx !== qIndex &&
        idx !== aIndex &&
        idx !== historyIndex &&
        header &&
        values[idx]
      ) {
        const key = header.replace(/^\*/, ''); // 移除开头的 *
        testCase.variables![key] = values[idx].trim();
      }
    });

    // 解析 history
    if (historyIndex !== -1 && values[historyIndex]) {
      try {
        const historyStr = values[historyIndex].trim();
        if (historyStr) {
          testCase.history = JSON.parse(historyStr);
        }
      } catch {
        // 忽略 history 解析错误
      }
    }

    testCases.push(testCase);
  }

  if (testCases.length === 0) {
    throw new Error('CSV 文件中没有有效的测试用例');
  }

  return testCases;
}

/**
 * 解析 CSV 行，处理引号和分隔符
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 使用 multer 处理文件上传
  const { file, data } = await uploadModel.getUploadFile<CreateEvalFormData>(req, res);

  const { name, evalModel, appId } = data;

  // 验证必填字段
  if (!appId) {
    throw new Error('appId 不能为空');
  }
  if (!name || !name.trim()) {
    throw new Error('评估名称不能为空');
  }

  // 读取并解析 CSV 文件
  let testCases: TestCase[];
  try {
    const fileContent = fs.readFileSync(file.path, 'utf-8');
    testCases = parseCSVContent(fileContent);
  } finally {
    // 清理临时文件
    try {
      fs.unlinkSync(file.path);
    } catch {
      // 忽略清理错误
    }
  }

  // 创建评估任务
  const evaluation = await MongoEvaluationModel.create({
    teamId,
    tmbId,
    appId,
    name: name.trim(),
    evaluatorModel: evalModel || 'gpt-4',
    status: EvaluationStatusEnum.queuing,
    progress: 0,
    totalItems: testCases.length,
    passedItems: 0,
    failedItems: 0,
    avgScore: 0
  });

  // 创建评估项目
  const evaluationItems = testCases.map((tc) => ({
    evaluationId: evaluation._id,
    input: tc.question,
    expectedOutput: tc.expectedResponse,
    variables: tc.variables,
    history: tc.history,
    status: EvaluationItemStatusEnum.pending,
    retryCount: 0
  }));

  await MongoEvaluationItemModel.insertMany(evaluationItems);

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CREATE_EVALUATION,
    metadata: {
      evalId: String(evaluation._id),
      appId,
      name: name.trim(),
      itemCount: testCases.length
    }
  });

  res.json({
    code: 200,
    statusText: '',
    message: '',
    data: {
      evalId: String(evaluation._id)
    }
  });
}

export default NextAPI(handler);
