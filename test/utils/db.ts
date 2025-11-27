/**
 * MongoDB 测试工具
 * 用于集成测试的数据库连接和清理
 */
import mongoose, { Schema, Model, Document, Types, Connection } from 'mongoose';
import { connectionMongo } from '../../src/packages/service/common/mongo';

// 测试数据库配置
// 可通过环境变量 TEST_MONGODB_URI 配置外部数据库
// 例如: TEST_MONGODB_URI="mongodb://root:password@cloud.sealos.io:32289/fastgpt-test?directConnection=true&authSource=admin"
const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/fastgpt-test';

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// ===== 类型定义 =====

interface TeamDocument extends Document {
  name: string;
  ownerId: Types.ObjectId;
  createTime: Date;
}

interface TeamMemberDocument extends Document {
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  role: string;
  status: string;
  createTime: Date;
}

interface UserDocument extends Document {
  username: string;
  email?: string;
  status: string;
  createTime: Date;
  lastLoginTime?: Date;
}

interface OrgDocument extends Document {
  teamId: Types.ObjectId;
  name: string;
  path: string;
  pathId: string;
  description?: string;
  createTime: Date;
  updateTime: Date;
}

interface OrgMemberDocument extends Document {
  teamId: Types.ObjectId;
  orgId: Types.ObjectId;
  tmbId: Types.ObjectId;
  createTime: Date;
}

interface OperationLogDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  event: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

interface BillDocument extends Document {
  orderId: string;
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  type: string;
  price: number;
  payment: string;
  status: string;
  createTime: Date;
  expireTime: Date;
  payTime?: Date;
  invoiced: boolean;
  invoiceId?: Types.ObjectId;
}

// ===== Phase 2 类型定义 =====

interface MemberGroupDocument extends Document {
  teamId: Types.ObjectId;
  name: string;
  avatar?: string;
  createTime: Date;
  updateTime: Date;
}

interface GroupMemberDocument extends Document {
  teamId: Types.ObjectId;
  groupId: Types.ObjectId;
  tmbId: Types.ObjectId;
  role: string;
  createTime: Date;
}

interface CollaboratorDocument extends Document {
  teamId: Types.ObjectId;
  resourceId: Types.ObjectId;
  resourceType: string;
  tmbId?: Types.ObjectId;
  groupId?: Types.ObjectId;
  orgId?: Types.ObjectId;
  permission: number;
  createTime: Date;
  updateTime: Date;
}

interface InvoiceDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  billIds: Types.ObjectId[];
  totalAmount: number;
  type: string;
  title: string;
  taxNumber: string;
  bankName?: string;
  bankAccount?: string;
  address?: string;
  phone?: string;
  receiverEmail?: string;
  receiverAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  status: string;
  rejectReason?: string;
  invoiceNo?: string;
  invoiceCode?: string;
  invoiceUrl?: string;
  invoiceDate?: Date;
  createTime: Date;
  updateTime: Date;
  completeTime?: Date;
}

interface AppDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  name: string;
  type: string;
  createTime: Date;
  updateTime: Date;
}

interface DatasetDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  name: string;
  createTime: Date;
  updateTime: Date;
}

interface ChatDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  appId: Types.ObjectId;
  chatId: string;
  title: string;
  messageCount: number;
  totalTokens: number;
  avgResponseTime: number;
  createTime: Date;
  updateTime: Date;
}

// ===== Phase 3 类型定义 =====

interface ChatSettingDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  homeEnabled: boolean;
  homeWelcome: string;
  homeBackground?: string;
  defaultAppId?: Types.ObjectId;
  sidebarCollapsed: boolean;
  preferences: {
    theme: string;
    fontSize: number;
    codeTheme: string;
  };
  createTime: Date;
  updateTime: Date;
}

interface FavouriteAppDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  appId: Types.ObjectId;
  order: number;
  tags: string[];
  customName?: string;
  customIcon?: string;
  createTime: Date;
}

interface EvaluationDocument extends Document {
  teamId: Types.ObjectId;
  tmbId: Types.ObjectId;
  appId: Types.ObjectId;
  name: string;
  description?: string;
  status: string;
  progress: number;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  avgScore: number;
  createTime: Date;
  updateTime: Date;
}

interface EvaluationItemDocument extends Document {
  evaluationId: Types.ObjectId;
  input: string;
  expectedOutput?: string;
  context?: string;
  actualOutput?: string;
  responseTime?: number;
  scores: { metric: string; score: number; reason?: string }[];
  totalScore: number;
  passed: boolean;
  status: string;
  error?: string;
  retryCount: number;
  createTime: Date;
  updateTime: Date;
}

// ===== Schema 定义 =====

const TeamSchema = new Schema<TeamDocument>({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, required: true },
  createTime: { type: Date, default: Date.now }
});

const TeamMemberSchema = new Schema<TeamMemberDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'member' },
  status: { type: String, default: 'active' },
  createTime: { type: Date, default: Date.now }
});

const UserSchema = new Schema<UserDocument>({
  username: { type: String, required: true },
  email: String,
  status: { type: String, default: 'active' },
  createTime: { type: Date, default: Date.now },
  lastLoginTime: Date
});

const OrgSchema = new Schema<OrgDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  path: { type: String, default: '' },
  pathId: { type: String, required: true },
  description: String,
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const OrgMemberSchema = new Schema<OrgMemberDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  orgId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  createTime: { type: Date, default: Date.now }
});

const OperationLogSchema = new Schema<OperationLogDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  event: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

const BillSchema = new Schema<BillDocument>({
  orderId: { type: String, required: true, unique: true },
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  payment: { type: String, required: true },
  status: { type: String, default: 'pending' },
  createTime: { type: Date, default: Date.now },
  expireTime: { type: Date, required: true },
  payTime: { type: Date },
  invoiced: { type: Boolean, default: false },
  invoiceId: { type: Schema.Types.ObjectId }
});

// ===== Phase 2 Schema 定义 =====

const MemberGroupSchema = new Schema<MemberGroupDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, maxlength: 50 },
  avatar: String,
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const GroupMemberSchema = new Schema<GroupMemberDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  groupId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  role: { type: String, default: 'member' },
  createTime: { type: Date, default: Date.now }
});
GroupMemberSchema.index({ groupId: 1, tmbId: 1 }, { unique: true });

const CollaboratorSchema = new Schema<CollaboratorDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  resourceId: { type: Schema.Types.ObjectId },
  resourceType: { type: String, enum: ['app', 'dataset', 'team'], required: true },
  tmbId: { type: Schema.Types.ObjectId },
  groupId: { type: Schema.Types.ObjectId },
  orgId: { type: Schema.Types.ObjectId },
  permission: { type: Number, required: true, default: 4 },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const InvoiceSchema = new Schema<InvoiceDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  billIds: [{ type: Schema.Types.ObjectId }],
  totalAmount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['normal', 'special'], default: 'normal' },
  title: { type: String, required: true, maxlength: 100 },
  taxNumber: { type: String, required: true, maxlength: 20 },
  bankName: String,
  bankAccount: String,
  address: String,
  phone: String,
  receiverEmail: String,
  receiverAddress: String,
  receiverName: String,
  receiverPhone: String,
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
  rejectReason: String,
  invoiceNo: String,
  invoiceCode: String,
  invoiceUrl: String,
  invoiceDate: Date,
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now },
  completeTime: Date
});

const AppSchema = new Schema<AppDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  type: { type: String, default: 'simple' },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const DatasetSchema = new Schema<DatasetDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const ChatSchema = new Schema<ChatDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  chatId: { type: String, required: true },
  title: { type: String, default: '新对话' },
  messageCount: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

// ===== Phase 3 Schema 定义 =====

const ChatSettingSchema = new Schema<ChatSettingDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  homeEnabled: { type: Boolean, default: false },
  homeWelcome: { type: String, default: '' },
  homeBackground: String,
  defaultAppId: { type: Schema.Types.ObjectId },
  sidebarCollapsed: { type: Boolean, default: false },
  preferences: {
    theme: { type: String, default: 'system' },
    fontSize: { type: Number, default: 14 },
    codeTheme: { type: String, default: 'github' }
  },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const FavouriteAppSchema = new Schema<FavouriteAppDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  order: { type: Number, default: 0 },
  tags: [{ type: String }],
  customName: String,
  customIcon: String,
  createTime: { type: Date, default: Date.now }
});

const EvaluationSchema = new Schema<EvaluationDocument>({
  teamId: { type: Schema.Types.ObjectId, required: true },
  tmbId: { type: Schema.Types.ObjectId, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  description: String,
  status: { type: String, default: 'pending' },
  progress: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  passedItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

const EvaluationItemSchema = new Schema<EvaluationItemDocument>({
  evaluationId: { type: Schema.Types.ObjectId, required: true },
  input: { type: String, required: true },
  expectedOutput: String,
  context: String,
  actualOutput: String,
  responseTime: Number,
  scores: [{ metric: String, score: Number, reason: String }],
  totalScore: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  status: { type: String, default: 'pending' },
  error: String,
  retryCount: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

// ===== Model 获取函数 =====

function getModel<T extends Document>(name: string, schema: Schema<T>): Model<T> {
  // 使用 connectionMongo 以便与 API 代码共享同一个连接
  return connectionMongo.models[name] as Model<T> || connectionMongo.model<T>(name, schema);
}

// ===== 数据库连接函数 =====

/**
 * 连接测试数据库
 * 同时连接本地 mongoose 和 API 使用的 connectionMongo
 */
export async function connectTestDB(): Promise<typeof mongoose> {
  const connectOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000
  };

  try {
    // 连接本地 mongoose（用于测试工厂方法）
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(TEST_DB_URI, connectOptions);
    }

    // 连接 API 使用的 connectionMongo
    if (connectionMongo.connection.readyState !== 1) {
      await connectionMongo.connect(TEST_DB_URI, connectOptions);
    }

    // 动态导入 connectionLogMongo 并连接
    const { connectionLogMongo } = await import(
      '../../src/packages/service/common/mongo/index'
    );
    if (connectionLogMongo.connection.readyState !== 1) {
      await connectionLogMongo.connect(TEST_DB_URI, connectOptions);
    }

    console.log(`Connected to test database: ${TEST_DB_URI.replace(/:[^:@]+@/, ':***@')}`);
    return mongoose;
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * 断开测试数据库连接
 */
export async function disconnectTestDB(): Promise<void> {
  // 断开本地 mongoose
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // 断开 API 使用的 connectionMongo
  if (connectionMongo.connection.readyState !== 0) {
    await connectionMongo.disconnect();
  }
  
  // 动态导入 connectionLogMongo 并断开连接
  try {
    const { connectionLogMongo } = await import(
      '../../src/packages/service/common/mongo/index'
    );
    if (connectionLogMongo.connection.readyState !== 0) {
      await connectionLogMongo.disconnect();
    }
  } catch (error) {
    // ignore
  }
  
  console.log('Disconnected from test database');
}

/**
 * 清理指定集合的所有数据
 */
export async function clearCollection(collectionName: string): Promise<void> {
  if (connectionMongo.connection.readyState !== 1) {
    throw new Error('Database not connected');
  }

  const collection = connectionMongo.connection.collection(collectionName);
  await collection.deleteMany({});
}

/**
 * 清理所有测试集合
 */
export async function clearAllTestCollections(): Promise<void> {
  const collections = [
    'operationLogs',       // 审计日志（API使用的集合名）
    'team_orgs',           // 组织架构（API使用的集合名）
    'team_org_members',    // 组织成员（API使用的集合名）
    'team_bills',          // 账单（API使用的集合名）
    'users',
    'oauth_bindings',
    'team.members',        // API 使用的 team member 集合名
    'teams',
    // Phase 2 collections
    'member_groups',
    'group_members',
    'collaborators',
    'invoices',
    'apps',
    'datasets',
    'chats',
    // Phase 3 collections
    'chat_settings',
    'favourite_apps',
    'evaluations',
    'evaluation_items',
    // Phase 5B collections
    'invitation_links',
    'team_members',
    // Phase 6C collections
    'coupon_codes',
    'user_coupons',
    'invoice_headers',
    // Phase 6D collections
    'team_tags',
    'dataset_sync_tasks',
    'dataset_collections',
    'promotion_records'
  ];

  for (const name of collections) {
    try {
      await clearCollection(name);
    } catch {
      // 集合可能不存在，忽略错误
    }
  }
}

// ===== 测试数据工厂 =====

export const testDataFactory = {
  /**
   * 创建测试团队
   */
  async createTeam(data: Partial<{ name: string; ownerId: string }> = {}): Promise<TeamDocument> {
    const Team = getModel<TeamDocument>('team', TeamSchema);
    return Team.create({
      name: data.name || `test-team-${Date.now()}`,
      ownerId: data.ownerId ? new Types.ObjectId(data.ownerId) : new Types.ObjectId()
    });
  },

  /**
   * 创建测试团队成员
   * 注：使用 API 定义的集合名 'team_members'
   */
  async createTeamMember(data: {
    teamId: string;
    userId: string;
    name?: string;
    role?: string;
    status?: string;
  }): Promise<TeamMemberDocument> {
    // 动态导入 API 使用的 Model，确保使用相同的集合
    const { MongoTeamMemberModel } = await import(
      '../../src/packages/service/support_user/team/teamMemberSchema'
    );
    return MongoTeamMemberModel.create({
      teamId: new Types.ObjectId(data.teamId),
      userId: new Types.ObjectId(data.userId),
      name: data.name || `member-${Date.now()}`,
      role: data.role || 'member',
      status: data.status || 'active'
    }) as unknown as Promise<TeamMemberDocument>;
  },

  /**
   * 创建测试用户
   */
  async createUser(data: Partial<{
    username: string;
    email: string;
    status: string;
  }> = {}): Promise<UserDocument> {
    const User = getModel<UserDocument>('user', UserSchema);
    return User.create({
      username: data.username || `user-${Date.now()}`,
      email: data.email || `user-${Date.now()}@test.com`,
      status: data.status || 'active'
    });
  },

  /**
   * 创建测试组织
   */
  async createOrg(data: {
    teamId: string;
    name: string;
    path?: string;
    pathId?: string;
    description?: string;
  }): Promise<OrgDocument> {
    // 动态导入 API 使用的 Model
    const { MongoOrgModel } = await import(
      '../../src/packages/service/support_permission/org/orgSchema'
    );
    const { getNanoid } = await import(
      '../../src/packages/global/common/string/tools'
    );
    return MongoOrgModel.create({
      teamId: new Types.ObjectId(data.teamId),
      name: data.name,
      path: data.path ?? '',
      pathId: data.pathId ?? getNanoid(),
      description: data.description
    }) as unknown as Promise<OrgDocument>;
  },

  /**
   * 创建测试组织成员
   */
  async createOrgMember(data: {
    teamId: string;
    orgId: string;
    tmbId: string;
  }): Promise<OrgMemberDocument> {
    // 动态导入 API 使用的 Model
    const { MongoOrgMemberModel } = await import(
      '../../src/packages/service/support_permission/org/orgMemberSchema'
    );
    return MongoOrgMemberModel.create({
      teamId: new Types.ObjectId(data.teamId),
      orgId: new Types.ObjectId(data.orgId),
      tmbId: new Types.ObjectId(data.tmbId)
    }) as unknown as Promise<OrgMemberDocument>;
  },

  /**
   * 创建测试操作日志
   */
  async createOperationLog(data: {
    teamId: string;
    tmbId: string;
    event: string;
    metadata?: Record<string, unknown>;
  }): Promise<OperationLogDocument> {
    // 动态导入 API 使用的 Model
    const { MongoOperationLog } = await import(
      '../../src/packages/service/support_user_audit/schema'
    );
    return MongoOperationLog.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      event: data.event,
      metadata: data.metadata || {}
    }) as unknown as Promise<OperationLogDocument>;
  },

  /**
   * 创建测试账单
   */
  async createBill(data: {
    teamId: string;
    tmbId: string;
    type: string;
    price: number;
    payment: string;
    status?: string;
  }): Promise<BillDocument> {
    // 动态导入 API 使用的 Model
    const { MongoBillModel } = await import(
      '../../src/packages/service/support_wallet/bill/schema'
    );
    return MongoBillModel.create({
      orderId: `FG${Date.now()}${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      type: data.type,
      price: data.price,
      payment: data.payment,
      status: data.status || 'pending',
      expireTime: new Date(Date.now() + 15 * 60 * 1000)
    }) as unknown as Promise<BillDocument>;
  },

  /**
   * 生成随机 ObjectId
   */
  randomObjectId(): string {
    return new Types.ObjectId().toString();
  },

  // ===== Phase 2 工厂方法 =====

  /**
   * 创建成员分组
   */
  async createMemberGroup(data: {
    teamId: string;
    name: string;
    avatar?: string;
  }): Promise<MemberGroupDocument> {
    // 动态导入 API 使用的 Model
    const { MongoMemberGroupModel } = await import(
      '../../src/packages/service/support_permission/memberGroup/memberGroupSchema'
    );
    return MongoMemberGroupModel.create({
      teamId: new Types.ObjectId(data.teamId),
      name: data.name,
      avatar: data.avatar
    }) as unknown as Promise<MemberGroupDocument>;
  },

  /**
   * 创建分组成员关系
   */
  async createGroupMember(data: {
    teamId: string;
    groupId: string;
    tmbId: string;
    role?: string;
  }): Promise<GroupMemberDocument> {
    // 动态导入 API 使用的 Model
    const { MongoGroupMemberModel } = await import(
      '../../src/packages/service/support_permission/memberGroup/groupMemberSchema'
    );
    return MongoGroupMemberModel.create({
      teamId: new Types.ObjectId(data.teamId),
      groupId: new Types.ObjectId(data.groupId),
      tmbId: new Types.ObjectId(data.tmbId),
      role: data.role || 'member'
    }) as unknown as Promise<GroupMemberDocument>;
  },

  /**
   * 创建协作者
   */
  async createCollaborator(data: {
    teamId: string;
    resourceId?: string;
    resourceType: 'app' | 'dataset' | 'team';
    tmbId?: string;
    groupId?: string;
    orgId?: string;
    permission?: number;
  }): Promise<CollaboratorDocument> {
    // 动态导入 API 使用的 Model
    const { MongoCollaboratorModel } = await import(
      '../../src/packages/service/support_permission/collaborator/schema'
    );
    return MongoCollaboratorModel.create({
      teamId: new Types.ObjectId(data.teamId),
      // team 类型不需要 resourceId
      resourceId: data.resourceId ? new Types.ObjectId(data.resourceId) : undefined,
      resourceType: data.resourceType,
      tmbId: data.tmbId ? new Types.ObjectId(data.tmbId) : undefined,
      groupId: data.groupId ? new Types.ObjectId(data.groupId) : undefined,
      orgId: data.orgId ? new Types.ObjectId(data.orgId) : undefined,
      permission: data.permission ?? 4 // 默认只读
    }) as unknown as Promise<CollaboratorDocument>;
  },

  /**
   * 创建发票
   */
  async createInvoice(data: {
    teamId: string;
    tmbId: string;
    billIds: string[];
    totalAmount: number;
    type?: 'normal' | 'special';
    title: string;
    taxNumber: string;
    status?: 'pending' | 'processing' | 'completed' | 'rejected';
    bankName?: string;
    bankAccount?: string;
  }): Promise<InvoiceDocument> {
    // 动态导入 API 使用的 Model
    const { MongoInvoiceModel } = await import(
      '../../src/packages/service/support_wallet/invoice/schema'
    );
    return MongoInvoiceModel.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      billIds: data.billIds.map(id => new Types.ObjectId(id)),
      totalAmount: data.totalAmount,
      type: data.type || 'normal',
      title: data.title,
      taxNumber: data.taxNumber,
      status: data.status || 'pending',
      bankName: data.bankName,
      bankAccount: data.bankAccount
    }) as unknown as Promise<InvoiceDocument>;
  },

  /**
   * 创建应用
   * 注：使用 connectionMongo 以便与 API 共享同一连接
   */
  async createApp(data: {
    teamId: string;
    tmbId: string;
    name: string;
    type?: string;
  }): Promise<AppDocument> {
    // 使用 connectionMongo 创建 Model，确保数据写入正确的集合
    const App = connectionMongo.models['app'] as Model<AppDocument> ||
      connectionMongo.model<AppDocument>('app', AppSchema);
    return App.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      name: data.name,
      type: data.type || 'simple'
    });
  },

  /**
   * 创建数据集
   * 注：使用 connectionMongo 以便与 API 共享同一连接
   */
  async createDataset(data: {
    teamId: string;
    tmbId: string;
    name: string;
  }): Promise<DatasetDocument> {
    // 使用 connectionMongo 创建 Model，确保数据写入正确的集合
    const Dataset = connectionMongo.models['dataset'] as Model<DatasetDocument> ||
      connectionMongo.model<DatasetDocument>('dataset', DatasetSchema);
    return Dataset.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      name: data.name
    });
  },

  /**
   * 创建聊天记录
   */
  async createChat(data: {
    teamId: string;
    tmbId: string;
    appId: string;
    title?: string;
    messageCount?: number;
    totalTokens?: number;
    avgResponseTime?: number;
    createTime?: Date;
  }): Promise<ChatDocument> {
    // 动态导入 API 使用的 Model
    const { MongoChatModel } = await import(
      '../../src/packages/service/core/chat/schema'
    );
    return MongoChatModel.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      appId: new Types.ObjectId(data.appId),
      chatId: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title: data.title || '新对话',
      messageCount: data.messageCount ?? 0,
      totalTokens: data.totalTokens ?? 0,
      avgResponseTime: data.avgResponseTime ?? 0,
      createTime: data.createTime || new Date()
    }) as unknown as Promise<ChatDocument>;
  },

  // ===== Phase 3 工厂方法 =====

  /**
   * 创建聊天设置
   */
  async createChatSetting(data: {
    teamId: string;
    tmbId: string;
    homeEnabled?: boolean;
    homeWelcome?: string;
    sidebarCollapsed?: boolean;
  }): Promise<ChatSettingDocument> {
    const ChatSetting = connectionMongo.models['chat_settings'] as Model<ChatSettingDocument> ||
      connectionMongo.model<ChatSettingDocument>('chat_settings', ChatSettingSchema);
    return ChatSetting.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      homeEnabled: data.homeEnabled ?? false,
      homeWelcome: data.homeWelcome ?? '',
      sidebarCollapsed: data.sidebarCollapsed ?? false,
      preferences: {
        theme: 'system',
        fontSize: 14,
        codeTheme: 'github'
      }
    });
  },

  /**
   * 创建收藏应用
   */
  async createFavouriteApp(data: {
    teamId: string;
    tmbId: string;
    appId: string;
    order?: number;
    tags?: string[];
    customName?: string;
  }): Promise<FavouriteAppDocument> {
    const FavouriteApp = connectionMongo.models['favourite_apps'] as Model<FavouriteAppDocument> ||
      connectionMongo.model<FavouriteAppDocument>('favourite_apps', FavouriteAppSchema);
    return FavouriteApp.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      appId: new Types.ObjectId(data.appId),
      order: data.order ?? 0,
      tags: data.tags ?? [],
      customName: data.customName
    });
  },

  /**
   * 创建评估任务
   */
  async createEvaluation(data: {
    teamId: string;
    tmbId: string;
    appId: string;
    name: string;
    description?: string;
    status?: string;
  }): Promise<EvaluationDocument> {
    const Evaluation = connectionMongo.models['evaluations'] as Model<EvaluationDocument> ||
      connectionMongo.model<EvaluationDocument>('evaluations', EvaluationSchema);
    return Evaluation.create({
      teamId: new Types.ObjectId(data.teamId),
      tmbId: new Types.ObjectId(data.tmbId),
      appId: new Types.ObjectId(data.appId),
      name: data.name,
      description: data.description,
      status: data.status ?? 'pending'
    });
  },

  /**
   * 创建评估项目
   */
  async createEvaluationItem(data: {
    evaluationId: string;
    input: string;
    expectedOutput?: string;
    context?: string;
    status?: string;
    retryCount?: number;
  }): Promise<EvaluationItemDocument> {
    const EvaluationItem = connectionMongo.models['evaluation_items'] as Model<EvaluationItemDocument> ||
      connectionMongo.model<EvaluationItemDocument>('evaluation_items', EvaluationItemSchema);
    return EvaluationItem.create({
      evaluationId: new Types.ObjectId(data.evaluationId),
      input: data.input,
      expectedOutput: data.expectedOutput,
      context: data.context,
      status: data.status ?? 'pending',
      retryCount: data.retryCount ?? 0
    });
  },

  // ===== Phase 6D 工厂方法 =====

  /**
   * 创建团队标签
   */
  async createTeamTag(data: {
    teamId: string;
    key: string;
    label: string;
    type?: 'single' | 'multi';
    options?: Array<{ value: string; label: string; color?: string }>;
  }): Promise<Document> {
    const { MongoTeamTagModel } = await import(
      '../../src/packages/service/support_user/team/tag/schema'
    );
    return MongoTeamTagModel.create({
      teamId: new Types.ObjectId(data.teamId),
      key: data.key,
      label: data.label,
      type: data.type ?? 'single',
      options: data.options ?? []
    }) as unknown as Promise<Document>;
  },

  /**
   * 创建推广记录
   */
  async createPromotionRecord(data: {
    promoterId: string;
    promotionCode: string;
    inviteeId: string;
    status?: 'pending' | 'valid' | 'invalid';
    reward?: number;
    rewardPaidAt?: Date;
    registerTime?: Date;
    validTime?: Date;
  }): Promise<Document> {
    const { MongoPromotionRecord } = await import(
      '../../src/packages/service/support/promotion/schema'
    );
    return MongoPromotionRecord.create({
      promoterId: new Types.ObjectId(data.promoterId),
      promotionCode: data.promotionCode,
      inviteeId: new Types.ObjectId(data.inviteeId),
      status: data.status ?? 'pending',
      reward: data.reward ?? 0,
      rewardPaidAt: data.rewardPaidAt,
      registerTime: data.registerTime ?? new Date(),
      validTime: data.validTime
    }) as unknown as Promise<Document>;
  }
};

// ===== 导出模型获取函数 =====

export function getTestModels() {
  return {
    Team: getModel<TeamDocument>('team', TeamSchema),
    TeamMember: getModel<TeamMemberDocument>('team.member', TeamMemberSchema),
    User: getModel<UserDocument>('user', UserSchema),
    Org: getModel<OrgDocument>('team_orgs', OrgSchema),
    OrgMember: getModel<OrgMemberDocument>('team_org_members', OrgMemberSchema),
    OperationLog: getModel<OperationLogDocument>('operationLogs', OperationLogSchema),
    Bill: getModel<BillDocument>('team_bills', BillSchema),
    // Phase 2 models - 集合名称与 API 使用的一致
    MemberGroup: getModel<MemberGroupDocument>('member_groups', MemberGroupSchema),
    GroupMember: getModel<GroupMemberDocument>('group_members', GroupMemberSchema),
    Collaborator: getModel<CollaboratorDocument>('collaborators', CollaboratorSchema),
    Invoice: getModel<InvoiceDocument>('invoices', InvoiceSchema),
    App: getModel<AppDocument>('apps', AppSchema),
    Dataset: getModel<DatasetDocument>('datasets', DatasetSchema),
    Chat: getModel<ChatDocument>('chats', ChatSchema)
  };
}
