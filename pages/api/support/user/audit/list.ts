import type { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOperationLog } from '@fastgpt/service/support_user_audit/schema';
import { TeamMemberCollectionName, TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';
import type {
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  OperationListItemType
} from '@fastgpt/global/support_user_audit/type';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<GetAuditLogsRequest>,
  _res: NextApiResponse
): Promise<GetAuditLogsResponse> {
  const {
    pageNum = 1,
    pageSize = 20,
    tmbIds,
    events,
    startTime,
    endTime
  } = req.body;

  const teamId = getTeamIdFromReq(req);

  // 构建查询条件
  type QueryValue = Types.ObjectId | string | string[] | { $in: (string | Types.ObjectId)[] } | { $gte?: Date; $lte?: Date };
  const query: Record<string, QueryValue> = { teamId: new Types.ObjectId(teamId) };

  if (tmbIds && tmbIds.length > 0) {
    query.tmbId = { $in: tmbIds.map((id) => new Types.ObjectId(id)) };
  }

  if (events && events.length > 0) {
    query.event = { $in: events };
  }

  if (startTime || endTime) {
    query.timestamp = {};
    if (startTime) {
      query.timestamp.$gte = new Date(startTime);
    }
    if (endTime) {
      query.timestamp.$lte = new Date(endTime);
    }
  }

  // 分页参数
  const skip = (pageNum - 1) * Math.min(pageSize, 100);
  const limit = Math.min(pageSize, 100);

  // 并行执行查询和计数
  const [logs, total] = await Promise.all([
    MongoOperationLog.aggregate([
      { $match: query },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: TeamMemberCollectionName,
          localField: 'tmbId',
          foreignField: '_id',
          as: 'member'
        }
      },
      { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          event: 1,
          timestamp: 1,
          metadata: 1,
          sourceMember: {
            name: { $ifNull: ['$member.name', '未知用户'] },
            avatar: { $ifNull: ['$member.avatar', ''] },
            status: { $ifNull: ['$member.status', TeamMemberStatusEnum.active] }
          }
        }
      }
]),
    MongoOperationLog.countDocuments(query)
  ]);

  interface AggregatedLog {
    _id: Types.ObjectId;
    event: string;
    timestamp: Date;
    metadata: Record<string, string | number | boolean>;
    sourceMember?: {
      name: string;
      avatar: string;
      status: string;
    };
  }

  const list: OperationListItemType[] = logs.map((log: AggregatedLog) => {
    const memberName = log.sourceMember?.name || '未知用户';

    // 将 name 合并到 metadata 中，用于前端模板替换 {{name}}
    const enrichedMetadata = {
      ...log.metadata,
      name: memberName
    };

    return {
      _id: String(log._id),
      sourceMember: {
        name: memberName,
        avatar: log.sourceMember?.avatar || '',
        status: (log.sourceMember?.status || TeamMemberStatusEnum.active) as `${TeamMemberStatusEnum}`
      },
      event: log.event as OperationListItemType['event'],
      timestamp: log.timestamp,
      metadata: enrichedMetadata
    };
  });

  return {
    list,
    total
  };
}

export default NextAPI(handler);
