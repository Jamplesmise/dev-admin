import { isTestEnv } from '../../../global/common/system/constants';
import { addLog } from '../system/log';
import mongoose, {
  Mongoose,
  Schema,
  Types,
  type Model,
  type ClientSession,
  type FilterQuery,
  type UpdateQuery,
  type QueryOptions
} from 'mongoose';

// 扩展 globalThis 类型
declare global {
  // eslint-disable-next-line no-var
  var mongodb: Mongoose | undefined;
  // eslint-disable-next-line no-var
  var mongodbLog: Mongoose | undefined;
}

export default mongoose;
// 按需导出 mongoose 常用类型和工具，避免 export * 导致的 TypeScript 内存溢出
export { Schema, Types };
export type { Model, ClientSession, FilterQuery, UpdateQuery, QueryOptions };

export const MONGO_URL = process.env.MONGODB_URI as string;
export const MONGO_LOG_URL = (process.env.MONGODB_LOG_URI ?? process.env.MONGODB_URI) as string;

export const connectionMongo = (() => {
  if (!globalThis.mongodb) {
    globalThis.mongodb = new Mongoose();
    // 连接 MongoDB
    if (MONGO_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
      globalThis.mongodb.connect(MONGO_URL, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 50,
        minPoolSize: 10
      }).then(() => {
        if (!isTestEnv) console.log('✅ MongoDB 主连接成功');
      }).catch((err) => {
        addLog.error('MongoDB 主连接失败', err);
      });
    }
  }
  return globalThis.mongodb;
})();

export const connectionLogMongo = (() => {
  if (!globalThis.mongodbLog) {
    globalThis.mongodbLog = new Mongoose();
    // 连接 MongoDB Log
    if (MONGO_LOG_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
      globalThis.mongodbLog.connect(MONGO_LOG_URL, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 20,
        minPoolSize: 5
      }).then(() => {
        if (!isTestEnv) console.log('✅ MongoDB Log 连接成功');
      }).catch((err) => {
        addLog.error('MongoDB Log 连接失败', err);
      });
    }
  }
  return globalThis.mongodbLog;
})();

const addCommonMiddleware = (schema: mongoose.Schema) => {
  const operations = [
    /^find/,
    'save',
    'create',
    /^update/,
    /^delete/,
    'aggregate',
    'count',
    'countDocuments',
    'estimatedDocumentCount',
    'distinct',
    'insertMany'
  ];

  interface QueryContext {
    _startTime?: number;
    _query?: Record<string, unknown> | null;
    _update?: Record<string, unknown>;
    _delete?: Record<string, unknown>;
    collection?: { name: string };
    op?: string;
    getQuery?: () => Record<string, unknown>;
  }

  interface DocumentWithId {
    _id?: { toString: () => string; _bsontype?: string };
    [key: string]: unknown;
  }

  operations.forEach((op) => {
    schema.pre(op, function (this: QueryContext) {
      this._startTime = Date.now();
      this._query = this.getQuery ? this.getQuery() : null;
    });

    schema.post(op, function (this: QueryContext) {
      if (this._startTime) {
        const duration = Date.now() - this._startTime;
        const warnLogData = {
          collectionName: this.collection?.name,
          op: this.op,
          ...(this._query && { query: this._query }),
          ...(this._update && { update: this._update }),
          ...(this._delete && { delete: this._delete }),
          duration
        };

        if (duration > 1000) {
          addLog.warn(`Slow operation ${duration}ms`, warnLogData);
        }
      }
    });

    // Convert _id to string
    schema.post(/^find/, function (docs: DocumentWithId | DocumentWithId[] | null) {
      if (!docs) return;

      const convertObjectIds = (obj: DocumentWithId) => {
        if (!obj) return;

        // Convert _id
        if (obj._id && obj._id.toString) {
          obj._id = obj._id.toString() as unknown as { toString: () => string };
        }

        // Convert other ObjectId fields
        Object.keys(obj).forEach((key) => {
          const value = obj[key] as { _bsontype?: string; toString?: () => string } | null;
          if (value && value._bsontype === 'ObjectId' && value.toString) {
            obj[key] = value.toString();
          }
        });
      };

      if (Array.isArray(docs)) {
        docs.forEach((doc) => convertObjectIds(doc));
      } else {
        convertObjectIds(docs);
      }
    });
  });

  return schema;
};

export const getMongoModel = <T>(name: string, schema: mongoose.Schema) => {
  if (connectionMongo.models[name]) return connectionMongo.models[name] as Model<T>;
  if (!isTestEnv) console.log('Load model======', name);
  addCommonMiddleware(schema);

  const model = connectionMongo.model<T>(name, schema);

  // Sync index
  syncMongoIndex(model);

  return model;
};

export const getMongoLogModel = <T>(name: string, schema: mongoose.Schema) => {
  if (connectionLogMongo.models[name]) return connectionLogMongo.models[name] as Model<T>;
  console.log('Load model======', name);
  // addCommonMiddleware(schema); 

  const model = connectionLogMongo.model<T>(name, schema);

  // Sync index
  syncMongoIndex(model);

  return model;
};

const syncMongoIndex = async <T>(model: Model<T>) => {
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.SYNC_INDEX === '0' ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    !MONGO_URL
  ) {
    return;
  }

  try {
    await model.syncIndexes({ background: true });
  } catch (error) {
    addLog.error('Create index error', error);
  }
};

export const ReadPreference = connectionMongo.mongo.ReadPreference;
