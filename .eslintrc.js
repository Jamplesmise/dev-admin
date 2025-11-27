module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json']
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.js',
    '!.eslintrc.js'
  ],
  rules: {
    // TypeScript 严格模式规则
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false
    }],
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // 代码质量规则
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-template-curly-in-string': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // 代码风格 (配合 Prettier)
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true }],

    // 安全相关规则
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error'
  },
  overrides: [
    {
      // 测试文件放宽限制
      files: ['**/*.test.ts', '**/*.spec.ts', 'test/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off'
      }
    },
    {
      // 类型声明文件
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off'
      }
    },
    {
      // 字符串工具函数 - 允许控制字符正则 (用于安全过滤)
      files: ['**/common/string/tools.ts'],
      rules: {
        'no-control-regex': 'off'
      }
    }
  ]
};
