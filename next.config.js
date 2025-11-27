const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 standalone 输出模式（Docker 优化）
  output: 'standalone',

  // 生产环境优化
  reactStrictMode: true,
  swcMinify: true,

  // 性能优化
  compress: true,

  // 环境变量（仅公开前缀为 NEXT_PUBLIC_ 的变量）
  env: {
    CUSTOM_ENV: process.env.NODE_ENV,
  },

  // 图片优化配置（纯后端项目，不需要图片优化）
  images: {
    unoptimized: true,
  },

  // TypeScript 配置：禁用构建时类型检查（避免 OOM）
  // 参考 CLAUDE.md 第七节：由于 Mongoose 类型系统会导致 OOM，构建时跳过类型检查
  // 类型检查通过 IDE (VS Code) 和开发时的增量检查完成
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint 配置：构建时跳过 ESLint（避免 OOM + 加快构建速度）
  // ESLint 检查通过 pnpm lint 单独运行
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 实验性功能：优化服务器组件
  experimental: {
    serverComponentsExternalPackages: [
      'mongoose',
      '@zilliz/milvus2-sdk-node',
      'pg',
      'ioredis'
    ],
  },

  // Webpack 配置：添加路径别名 + 外部依赖优化
  webpack: (config, { isServer }) => {
    // 添加路径别名
    config.resolve.alias = {
      ...config.resolve.alias,
      '@fastgpt/global': path.resolve(__dirname, 'src/packages/global'),
      '@fastgpt/service': path.resolve(__dirname, 'src/packages/service'),
    };

    // 仅在服务端构建时优化外部依赖（不打包到 bundle 中）
    if (isServer) {
      // 这些依赖包含原生模块或体积很大，不应该打包
      config.externals = [
        ...(config.externals || []),
        // MongoDB 驱动不打包（原生模块）
        'mongodb-client-encryption',
        'kerberos',
        '@mongodb-js/zstd',
        'snappy',
        'aws4',
        'socks',
      ];
    }

    return config;
  },
}

module.exports = nextConfig
