/**
 * 数据库测试辅助工具
 * 用于管理测试数据库连接和清理
 */
import mongoose from 'mongoose';

// 测试数据库配置
export const TEST_DB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/fastgpt-test';

/**
 * 连接到测试数据库
 */
export async function connectTestDB(): Promise<void> {
  try {
    // 断开任何现有连接
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // 连接到测试数据库
    await mongoose.connect(TEST_DB_URI);
    console.log(`Connected to test database: ${TEST_DB_URI}`);
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * 断开测试数据库连接
 */
export async function disconnectTestDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from test database');
    }
  } catch (error) {
    console.error('Error disconnecting from test database:', error);
  }
}

/**
 * 清理测试数据库
 * 删除所有集合中的数据（谨慎使用）
 */
export async function cleanTestDB(): Promise<void> {
  if (!TEST_DB_URI.includes('test')) {
    throw new Error('Safety check: Database URI must contain "test"');
  }

  try {
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      await collection.deleteMany({});
    }

    console.log('Test database cleaned');
  } catch (error) {
    console.error('Error cleaning test database:', error);
    throw error;
  }
}

/**
 * 清理特定集合
 */
export async function cleanCollection(collectionName: string): Promise<void> {
  try {
    const collection = mongoose.connection.db.collection(collectionName);
    await collection.deleteMany({});
    console.log(`Collection ${collectionName} cleaned`);
  } catch (error) {
    console.error(`Error cleaning collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * 创建测试数据
 */
export async function createTestData<T>(
  modelName: string,
  data: T | T[]
): Promise<any> {
  try {
    const Model = mongoose.model(modelName);
    const result = await Model.create(data);
    return result;
  } catch (error) {
    console.error(`Error creating test data for ${modelName}:`, error);
    throw error;
  }
}

/**
 * 查找测试数据
 */
export async function findTestData(
  modelName: string,
  query: any = {}
): Promise<any[]> {
  try {
    const Model = mongoose.model(modelName);
    const result = await Model.find(query).lean();
    return result;
  } catch (error) {
    console.error(`Error finding test data for ${modelName}:`, error);
    throw error;
  }
}

/**
 * 等待数据库操作完成
 */
export function waitForDB(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}