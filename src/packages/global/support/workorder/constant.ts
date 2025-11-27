export const WorkOrderCollectionName = 'work_orders';

// 工单类型
export enum WorkOrderTypeEnum {
  bug = 'bug', // Bug 反馈
  feature = 'feature', // 功能建议
  question = 'question', // 使用咨询
  other = 'other' // 其他
}

// 工单状态
export enum WorkOrderStatusEnum {
  created = 'created', // 已创建
  processing = 'processing', // 处理中
  resolved = 'resolved', // 已解决
  closed = 'closed' // 已关闭
}

// 优先级
export enum WorkOrderPriorityEnum {
  low = 'low', // 低
  medium = 'medium', // 中
  high = 'high' // 高
}
