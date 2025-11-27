import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      // 启用测试模式，让 authMiddleware 跳过真实认证
      TEST_MODE: 'true'
    },
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'test', '**/*.d.ts', '**/*.test.ts']
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // 禁用文件级别的并行执行，因为所有测试文件共享同一个数据库
    // 这样可以避免测试之间的数据冲突
    fileParallelism: false
  },
  resolve: {
    alias: {
      // API 路由在 pages/api 目录，需要单独映射
      '@/api': path.resolve(__dirname, 'pages/api'),
      // 其他 src 目录的映射
      '@': path.resolve(__dirname, 'src'),
      '@fastgpt/global': path.resolve(__dirname, 'src/packages/global'),
      '@fastgpt/service': path.resolve(__dirname, 'src/packages/service'),
      '@test': path.resolve(__dirname, 'test')
    }
  }
});
