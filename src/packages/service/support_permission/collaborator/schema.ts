import { TeamCollectionName, TeamMemberCollectionName } from '../../../global/support_user_team/constant';
import { MemberGroupCollectionName } from '../../../global/support_user_team/group/constant';
import { OrgCollectionName } from '../../../global/support_user_team/org/constant';
import {
  CollaboratorCollectionName,
  ResourceTypeEnum,
  PermissionPresets
} from '../../../global/support/permission/collaborator/constant';
import type { CollaboratorSchemaType } from '../../../global/support/permission/collaborator/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';

const { Schema } = connectionMongo;

export const CollaboratorSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },

    // 资源信息
    // 注：对于 team 类型，resourceId 可以为空（使用 teamId 作为资源标识）
    // 注：对于 model 类型，resourceId 是模型名称字符串，不是 ObjectId
    resourceId: {
      type: Schema.Types.Mixed, // 支持 ObjectId 或 String (模型名称)
      required: function (this: { resourceType: string }) {
        return this.resourceType !== ResourceTypeEnum.team;
      }
    },
    resourceType: {
      type: String,
      enum: Object.values(ResourceTypeEnum),
      required: true
    },

    // 协作者类型（三选一）
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: TeamMemberCollectionName
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: MemberGroupCollectionName
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: OrgCollectionName
    },

    // 权限值（位运算）
    permission: {
      type: Number,
      required: true,
      default: PermissionPresets.readOnly
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 验证：必须有且仅有一个协作者类型
CollaboratorSchema.pre('save', function () {
  const types = [this.tmbId, this.groupId, this.orgId].filter(Boolean);
  if (types.length !== 1) {
    throw new Error('必须指定且仅指定一个协作者类型 (tmbId/groupId/orgId)');
  }
});

// 索引
try {
  // 按资源查询协作者
  CollaboratorSchema.index({ teamId: 1, resourceType: 1, resourceId: 1 });
  // 按成员查询权限
  CollaboratorSchema.index({ resourceType: 1, resourceId: 1, tmbId: 1 });
  // 按分组查询权限
  CollaboratorSchema.index({ resourceType: 1, resourceId: 1, groupId: 1 });
  // 按组织查询权限
  CollaboratorSchema.index({ resourceType: 1, resourceId: 1, orgId: 1 });
  // 唯一约束：同一资源的同一协作者只能有一条记录
  CollaboratorSchema.index(
    { resourceType: 1, resourceId: 1, tmbId: 1 },
    { unique: true, sparse: true }
  );
  CollaboratorSchema.index(
    { resourceType: 1, resourceId: 1, groupId: 1 },
    { unique: true, sparse: true }
  );
  CollaboratorSchema.index(
    { resourceType: 1, resourceId: 1, orgId: 1 },
    { unique: true, sparse: true }
  );
  // 团队级别协作者索引（resourceType = 'team' 时，resourceId 可能为空）
  CollaboratorSchema.index({ teamId: 1, resourceType: 1 });
  CollaboratorSchema.index(
    { teamId: 1, resourceType: 1, tmbId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { resourceType: 'team' } }
  );
  CollaboratorSchema.index(
    { teamId: 1, resourceType: 1, groupId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { resourceType: 'team' } }
  );
  CollaboratorSchema.index(
    { teamId: 1, resourceType: 1, orgId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { resourceType: 'team' } }
  );
} catch (error) {
  console.log(error);
}

export const MongoCollaboratorModel = getMongoModel<CollaboratorSchemaType>(
  CollaboratorCollectionName,
  CollaboratorSchema
);
