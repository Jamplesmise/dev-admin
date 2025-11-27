// 应用评估控制器

import { MongoEvaluationModel } from './schema';
import { MongoEvaluationItemModel } from './itemSchema';
import type {
  evaluationType,
  listEvalItemsItem,
  EvalItemSchemaType
} from '../../../../global/core/app/evaluation/type';
import { EvaluationStatusEnum } from '../../../../global/core/app/evaluation/constant';
import type { PaginationResponse } from '../../../../global/common/type';

/**
 * 获取评估任务列表（按团队查询，与官方 FastGPT 一致）
 */
export const getEvaluationList = async ({
  teamId,
  searchKey,
  pageNum = 1,
  pageSize = 20
}: {
  teamId: string;
  searchKey?: string;
  pageNum?: number;
  pageSize?: number;
}): Promise<PaginationResponse<evaluationType>> => {
  const query: Record<string, unknown> = { teamId };

  // 支持按名称搜索
  if (searchKey) {
    query.name = { $regex: searchKey, $options: 'i' };
  }

  const skip = (pageNum - 1) * pageSize;

  const [list, total] = await Promise.all([
    MongoEvaluationModel.find(query)
      .sort({ createTime: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    MongoEvaluationModel.countDocuments(query)
  ]);

  // 获取每个评估任务的统计信息
  const evaluations: evaluationType[] = await Promise.all(
    list.map(async (item) => {
      // 获取评估项目统计
      const [totalCount, completedCount, errorCount] = await Promise.all([
        MongoEvaluationItemModel.countDocuments({ evalId: String(item._id) }),
        MongoEvaluationItemModel.countDocuments({
          evalId: String(item._id),
          status: EvaluationStatusEnum.completed
        }),
        MongoEvaluationItemModel.countDocuments({
          evalId: String(item._id),
          status: EvaluationStatusEnum.error
        })
      ]);

      return {
        _id: String(item._id),
        name: item.name,
        appId: String(item.appId),
        createTime: item.createTime,
        finishTime: item.finishTime,
        evalModel: item.evalModel || item.evaluatorModel || '',
        errorMessage: item.errorMessage || item.error,
        score: item.score || item.avgScore,
        // 执行者信息（暂用占位符，后续可扩展）
        executorAvatar: '',
        executorName: `成员_${String(item.tmbId).slice(-4)}`,
        // 应用信息（暂用占位符，后续可扩展）
        appAvatar: '',
        appName: `应用_${String(item.appId).slice(-4)}`,
        // 统计信息
        completedCount,
        errorCount,
        totalCount
      };
    })
  );

  return { list: evaluations, total };
};

/**
 * 删除评估任务（同时删除所有评估项目）
 */
export const deleteEvaluation = async ({
  teamId,
  evalId
}: {
  teamId: string;
  evalId: string;
}): Promise<void> => {
  // 检查评估任务是否存在
  const evaluation = await MongoEvaluationModel.findOne({
    _id: evalId,
    teamId
  });

  if (!evaluation) {
    throw new Error('评估任务不存在');
  }

  // 删除所有评估项目
  await MongoEvaluationItemModel.deleteMany({ evalId });

  // 删除评估任务
  await MongoEvaluationModel.deleteOne({ _id: evalId });
};

/**
 * 获取评估项目列表
 */
export const getEvaluationItems = async ({
  teamId,
  evalId,
  pageNum = 1,
  pageSize = 20
}: {
  teamId: string;
  evalId: string;
  pageNum?: number;
  pageSize?: number;
}): Promise<PaginationResponse<listEvalItemsItem>> => {
  // 检查评估任务是否存在且属于该团队
  const evaluation = await MongoEvaluationModel.findOne({
    _id: evalId,
    teamId
  });

  if (!evaluation) {
    throw new Error('评估任务不存在');
  }

  const query: Record<string, unknown> = { evalId };

  const skip = (pageNum - 1) * pageSize;

  const [list, total] = await Promise.all([
    MongoEvaluationItemModel.find(query)
      .sort({ createTime: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    MongoEvaluationItemModel.countDocuments(query)
  ]);

  const items: listEvalItemsItem[] = list.map((item) => ({
    evalItemId: String(item._id),
    evalId: String(item.evalId),
    question: item.question || item.input || '',
    expectedResponse: item.expectedResponse || item.expectedOutput || '',
    globalVariables: item.globalVariables,
    history: item.history,
    response: item.response || item.actualOutput,
    responseTime: item.responseTime,
    finishTime: item.finishTime || item.completeTime,
    status: item.status,
    retry: item.retry || item.retryCount || 0,
    errorMessage: item.errorMessage || item.error,
    accuracy: item.accuracy,
    relevance: item.relevance,
    semanticAccuracy: item.semanticAccuracy,
    score: item.score || item.totalScore
  }));

  return { list: items, total };
};

/**
 * 删除评估项目
 */
export const deleteEvaluationItem = async ({
  teamId,
  evalItemId
}: {
  teamId: string;
  evalItemId: string;
}): Promise<void> => {
  // 获取评估项目
  const item = await MongoEvaluationItemModel.findById(evalItemId);

  if (!item) {
    throw new Error('评估项目不存在');
  }

  // 检查评估任务是否属于该团队
  const evaluation = await MongoEvaluationModel.findOne({
    _id: item.evalId,
    teamId
  });

  if (!evaluation) {
    throw new Error('无权操作此评估项目');
  }

  // 删除评估项目
  await MongoEvaluationItemModel.deleteOne({ _id: evalItemId });
};

/**
 * 重试评估项目
 */
export const retryEvaluationItem = async ({
  teamId,
  evalItemId
}: {
  teamId: string;
  evalItemId: string;
}): Promise<listEvalItemsItem> => {
  // 获取评估项目
  const item = await MongoEvaluationItemModel.findById(evalItemId);

  if (!item) {
    throw new Error('评估项目不存在');
  }

  // 检查评估任务是否属于该团队
  const evaluation = await MongoEvaluationModel.findOne({
    _id: item.evalId,
    teamId
  });

  if (!evaluation) {
    throw new Error('无权操作此评估项目');
  }

  // 重置项目状态
  const updated = await MongoEvaluationItemModel.findByIdAndUpdate(
    evalItemId,
    {
      $set: {
        status: EvaluationStatusEnum.pending,
        response: undefined,
        responseTime: undefined,
        finishTime: undefined,
        errorMessage: undefined,
        accuracy: undefined,
        relevance: undefined,
        semanticAccuracy: undefined,
        score: undefined
      },
      $inc: { retry: 1 }
    },
    { new: true, lean: true }
  );

  if (!updated) {
    throw new Error('更新失败');
  }

  return {
    evalItemId: String(updated._id),
    evalId: String(updated.evalId),
    question: updated.question || '',
    expectedResponse: updated.expectedResponse || '',
    globalVariables: updated.globalVariables,
    history: updated.history,
    response: updated.response,
    responseTime: updated.responseTime,
    finishTime: updated.finishTime,
    status: updated.status,
    retry: updated.retry || 0,
    errorMessage: updated.errorMessage,
    accuracy: updated.accuracy,
    relevance: updated.relevance,
    semanticAccuracy: updated.semanticAccuracy,
    score: updated.score
  };
};

/**
 * 更新评估项目
 */
export const updateEvaluationItem = async ({
  teamId,
  evalItemId,
  question,
  expectedResponse,
  variables
}: {
  teamId: string;
  evalItemId: string;
  question: string;
  expectedResponse: string;
  variables: Record<string, string>;
}): Promise<listEvalItemsItem> => {
  // 获取评估项目
  const item = await MongoEvaluationItemModel.findById(evalItemId);

  if (!item) {
    throw new Error('评估项目不存在');
  }

  // 检查评估任务是否属于该团队
  const evaluation = await MongoEvaluationModel.findOne({
    _id: item.evalId,
    teamId
  });

  if (!evaluation) {
    throw new Error('无权操作此评估项目');
  }

  const updated = await MongoEvaluationItemModel.findByIdAndUpdate(
    evalItemId,
    {
      $set: {
        question,
        expectedResponse,
        globalVariables: variables
      }
    },
    { new: true, lean: true }
  );

  if (!updated) {
    throw new Error('更新失败');
  }

  return {
    evalItemId: String(updated._id),
    evalId: String(updated.evalId),
    question: updated.question || '',
    expectedResponse: updated.expectedResponse || '',
    globalVariables: updated.globalVariables,
    history: updated.history,
    response: updated.response,
    responseTime: updated.responseTime,
    finishTime: updated.finishTime,
    status: updated.status,
    retry: updated.retry || 0,
    errorMessage: updated.errorMessage,
    accuracy: updated.accuracy,
    relevance: updated.relevance,
    semanticAccuracy: updated.semanticAccuracy,
    score: updated.score
  };
};
