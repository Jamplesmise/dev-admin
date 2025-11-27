import type {
  WorkOrderTypeEnum,
  WorkOrderStatusEnum,
  WorkOrderPriorityEnum
} from './constant';

export type WorkOrderSchemaType = {
  _id: string;
  orderId: string;
  userId?: string;
  teamId?: string;
  contactEmail: string;
  type: `${WorkOrderTypeEnum}`;
  title: string;
  description: string;
  attachments: {
    filename: string;
    url: string;
    size: number;
  }[];
  priority: `${WorkOrderPriorityEnum}`;
  status: `${WorkOrderStatusEnum}`;
  assignee?: string;
  resolution?: string;
  resolveTime?: Date;
  internalNotes: {
    content: string;
    createdBy: string;
    createdAt: Date;
  }[];
  createTime: Date;
  updateTime: Date;
};

// API 请求类型
export type CreateWorkOrderBody = {
  type: `${WorkOrderTypeEnum}`;
  title: string;
  description: string;
  attachments?: {
    filename: string;
    url: string;
    size: number;
  }[];
  priority?: `${WorkOrderPriorityEnum}`;
  contactEmail?: string;
};

// API 响应类型
export type CreateWorkOrderResponse = {
  _id: string;
  orderId: string;
  ticketId: string;
  type: `${WorkOrderTypeEnum}`;
  title: string;
  description: string;
  priority: `${WorkOrderPriorityEnum}`;
  status: `${WorkOrderStatusEnum}`;
  contactEmail: string;
  attachments: {
    filename: string;
    url: string;
    size: number;
  }[];
  createTime: Date;
  userId?: string;
  teamId?: string;
};
