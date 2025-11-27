import { MongoWorkOrder } from './schema';
import type {
  CreateWorkOrderBody,
  CreateWorkOrderResponse
} from '../../../global/support/workorder/type';
import { WorkOrderStatusEnum } from '../../../global/support/workorder/constant';

/**
 * 创建工单
 */
export async function createWorkOrder({
  userId,
  teamId,
  contactEmail,
  type,
  title,
  description,
  attachments = [],
  priority = 'medium'
}: {
  userId?: string;
  teamId?: string;
  contactEmail: string;
} & CreateWorkOrderBody): Promise<CreateWorkOrderResponse> {
  const workOrder = await MongoWorkOrder.create({
    userId,
    teamId,
    contactEmail,
    type,
    title,
    description,
    attachments,
    priority,
    status: WorkOrderStatusEnum.created
  });

  // 返回完整的工单数据
  return {
    _id: workOrder._id.toString(),
    orderId: workOrder.orderId,
    ticketId: workOrder.orderId, // 兼容测试中的 ticketId 字段
    type: workOrder.type,
    title: workOrder.title,
    description: workOrder.description,
    priority: workOrder.priority,
    status: workOrder.status,
    contactEmail: workOrder.contactEmail,
    attachments: workOrder.attachments,
    createTime: workOrder.createTime,
    userId: workOrder.userId?.toString(),
    teamId: workOrder.teamId?.toString()
  };
}

/**
 * 获取用户的工单列表
 */
export async function getUserWorkOrders(userId: string) {
  return MongoWorkOrder.find({ userId })
    .sort({ createTime: -1 })
    .select('orderId type title status priority createTime')
    .lean();
}

/**
 * 更新工单状态
 */
export async function updateWorkOrderStatus({
  orderId,
  status,
  assignee,
  resolution
}: {
  orderId: string;
  status: string;
  assignee?: string;
  resolution?: string;
}) {
  const update: Record<string, unknown> = { status };

  if (assignee) {
    update.assignee = assignee;
  }

  if (resolution) {
    update.resolution = resolution;
  }

  if (status === WorkOrderStatusEnum.resolved) {
    update.resolveTime = new Date();
  }

  return MongoWorkOrder.updateOne({ orderId }, { $set: update });
}

/**
 * 添加内部备注
 */
export async function addInternalNote({
  orderId,
  content,
  createdBy
}: {
  orderId: string;
  content: string;
  createdBy: string;
}) {
  return MongoWorkOrder.updateOne(
    { orderId },
    {
      $push: {
        internalNotes: {
          content,
          createdBy,
          createdAt: new Date()
        }
      }
    }
  );
}
