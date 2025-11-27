import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 套餐等级
type PlanLevelType = 'free' | 'experience' | 'team' | 'enterprise' | 'custom';

// 套餐配置（简化版，实际应从数据库或配置读取）
const PlanConfig: Record<
  PlanLevelType,
  {
    name: string;
    maxMembers: number;
    maxApps: number;
    maxDatasets: number;
    maxDatasetSize: number;
    monthlyPoints: number;
  }
> = {
  free: {
    name: '免费版',
    maxMembers: 3,
    maxApps: 5,
    maxDatasets: 3,
    maxDatasetSize: 1,
    monthlyPoints: 1000
  },
  experience: {
    name: '体验版',
    maxMembers: 10,
    maxApps: 20,
    maxDatasets: 10,
    maxDatasetSize: 5,
    monthlyPoints: 10000
  },
  team: {
    name: '团队版',
    maxMembers: 50,
    maxApps: 100,
    maxDatasets: 50,
    maxDatasetSize: 50,
    monthlyPoints: 100000
  },
  enterprise: {
    name: '企业版',
    maxMembers: 500,
    maxApps: 1000,
    maxDatasets: 500,
    maxDatasetSize: 500,
    monthlyPoints: 1000000
  },
  custom: {
    name: '定制版',
    maxMembers: -1,
    maxApps: -1,
    maxDatasets: -1,
    maxDatasetSize: -1,
    monthlyPoints: -1
  }
};

type GetTeamPlansResponse = {
  planLevel: PlanLevelType;
  planName: string;
  expireTime?: Date;
  limits: {
    maxMembers: number;
    maxApps: number;
    maxDatasets: number;
    maxDatasetSize: number;
    monthlyPoints: number;
  };
  usage: {
    members: number;
    apps: number;
    datasets: number;
    datasetSize: number;
    usedPoints: number;
  };
  extraPurchase?: {
    datasetSize: number;
    points: number;
  };
};

/**
 * 获取团队套餐信息
 * GET /api/support/user/team/plan/getTeamPlans
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<GetTeamPlansResponse> {
  const teamId = getTeamIdFromReq(req);

  // 获取当前套餐等级（简化版，默认免费版）
  // TODO: 实际应从订阅表查询
  const planLevel: PlanLevelType = 'free';
  const planConfig = PlanConfig[planLevel];

  // 统计当前成员数
  const memberCount = await MongoTeamMemberModel.countDocuments({
    teamId,
    status: TeamMemberStatusEnum.active
  });

  // TODO: 统计应用数、数据集数、数据集大小、已用点数
  // 这里先返回模拟数据
  const usage = {
    members: memberCount,
    apps: 0,
    datasets: 0,
    datasetSize: 0,
    usedPoints: 0
  };

  return {
    planLevel,
    planName: planConfig.name,
    limits: {
      maxMembers: planConfig.maxMembers,
      maxApps: planConfig.maxApps,
      maxDatasets: planConfig.maxDatasets,
      maxDatasetSize: planConfig.maxDatasetSize,
      monthlyPoints: planConfig.monthlyPoints
    },
    usage
  };
}

export default NextAPI(handler);
