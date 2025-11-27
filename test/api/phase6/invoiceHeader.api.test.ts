/**
 * 发票抬头 API 集成测试
 * 测试 Phase 6C 发票抬头相关 API 端点
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, createTestContext, type AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handlers
import getTeamInvoiceHeaderHandler from '@/api/support/user/team/invoiceAccount/getTeamInvoiceHeader';
import updateHandler from '@/api/support/user/team/invoiceAccount/update';

describe('发票抬头 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
  let auth: AuthHeaders;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();
    const context = await createTestContext(testDataFactory);
    teamId = context.teamId;
    tmbId = context.tmbId;
    userId = context.userId;
    auth = context.auth;

    // 更新成员角色为 admin（需要权限才能更新发票抬头）
    const { MongoTeamMemberModel } = await import(
      '../../../src/packages/service/support_user/team/teamMemberSchema'
    );
    await MongoTeamMemberModel.updateOne(
      { _id: tmbId },
      { $set: { role: 'admin' } }
    );
  });

  describe('GET /api/support/user/team/invoiceAccount/getTeamInvoiceHeader', () => {
    it('应该返回 null 当没有发票抬头时', async () => {
      const response = await callApi(getTeamInvoiceHeaderHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data).toBeNull();
    });

    it('应该返回已保存的发票抬头', async () => {
      // 先创建发票抬头
      const { MongoInvoiceHeader } = await import(
        '../../../src/packages/service/support_wallet/invoiceHeader/schema'
      );
      await MongoInvoiceHeader.create({
        teamId,
        invoiceType: 'company',
        title: '测试公司',
        taxNumber: '123456789012345678',
        receiverName: '张三',
        receiverPhone: '13800138000',
        receiverAddress: '北京市朝阳区'
      });

      const response = await callApi(getTeamInvoiceHeaderHandler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess<{ title: string; taxNumber: string }>(response);
      expect(data.title).toBe('测试公司');
      expect(data.taxNumber).toBe('123456789012345678');
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(getTeamInvoiceHeaderHandler, {
        method: 'GET',
        skipAuthMock: true
      });

      expectError(response);
    });
  });

  describe('POST /api/support/user/team/invoiceAccount/update', () => {
    it('应该成功创建个人发票抬头', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'personal',
          title: '个人',
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区'
        }
      });

      expectSuccess(response);

      // 验证数据已保存
      const { MongoInvoiceHeader } = await import(
        '../../../src/packages/service/support_wallet/invoiceHeader/schema'
      );
      const header = await MongoInvoiceHeader.findOne({ teamId }).lean();
      expect(header).toBeTruthy();
      expect(header?.invoiceType).toBe('personal');
      expect(header?.title).toBe('个人');
    });

    it('应该成功创建企业发票抬头', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'company',
          title: '测试公司有限公司',
          taxNumber: '91110000100012345X',
          bankName: '中国银行',
          bankAccount: '1234567890',
          companyAddress: '北京市海淀区中关村',
          companyPhone: '010-12345678',
          receiverName: '李四',
          receiverPhone: '13900139000',
          receiverAddress: '北京市朝阳区望京',
          receiverEmail: 'test@example.com'
        }
      });

      expectSuccess(response);

      // 验证数据已保存
      const { MongoInvoiceHeader } = await import(
        '../../../src/packages/service/support_wallet/invoiceHeader/schema'
      );
      const header = await MongoInvoiceHeader.findOne({ teamId }).lean();
      expect(header?.invoiceType).toBe('company');
      expect(header?.taxNumber).toBe('91110000100012345X');
      expect(header?.bankName).toBe('中国银行');
    });

    it('应该成功更新已存在的发票抬头', async () => {
      // 先创建
      await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'personal',
          title: '个人',
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区'
        }
      });

      // 再更新
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'company',
          title: '新公司',
          taxNumber: '91110000100012345X',
          receiverName: '王五',
          receiverPhone: '13700137000',
          receiverAddress: '上海市浦东新区'
        }
      });

      expectSuccess(response);

      // 验证只有一条记录且已更新
      const { MongoInvoiceHeader } = await import(
        '../../../src/packages/service/support_wallet/invoiceHeader/schema'
      );
      const headers = await MongoInvoiceHeader.find({ teamId }).lean();
      expect(headers).toHaveLength(1);
      expect(headers[0].title).toBe('新公司');
      expect(headers[0].invoiceType).toBe('company');
    });

    it('企业类型缺少税号应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'company',
          title: '测试公司',
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区'
          // 缺少 taxNumber
        }
      });

      expectError(response);
    });

    it('税号格式错误应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'company',
          title: '测试公司',
          taxNumber: '123', // 太短
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区'
        }
      });

      expectError(response);
    });

    it('手机号格式错误应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'personal',
          title: '个人',
          receiverName: '张三',
          receiverPhone: '12345', // 格式错误
          receiverAddress: '北京市朝阳区'
        }
      });

      expectError(response);
    });

    it('邮箱格式错误应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'personal',
          title: '个人',
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区',
          receiverEmail: 'invalid-email'
        }
      });

      expectError(response);
    });

    it('缺少必填字段应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'personal'
          // 缺少 title, receiverName, receiverPhone, receiverAddress
        }
      });

      expectError(response);
    });

    it('普通成员无权更新应该返回错误', async () => {
      // 将成员角色改为普通成员
      const { MongoTeamMemberModel } = await import(
        '../../../src/packages/service/support_user/team/teamMemberSchema'
      );
      await MongoTeamMemberModel.updateOne(
        { _id: tmbId },
        { $set: { role: 'member' } }
      );

      const response = await callApi(updateHandler, {
        method: 'POST',
        auth,
        body: {
          invoiceType: 'personal',
          title: '个人',
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区'
        }
      });

      expectError(response);
    });

    it('未认证时应该返回错误', async () => {
      const response = await callApi(updateHandler, {
        method: 'POST',
        skipAuthMock: true,
        body: {
          invoiceType: 'personal',
          title: '个人',
          receiverName: '张三',
          receiverPhone: '13800138000',
          receiverAddress: '北京市朝阳区'
        }
      });

      expectError(response);
    });
  });
});
