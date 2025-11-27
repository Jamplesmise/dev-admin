import { TeamCollectionName } from '../../../global/support_user_team/constant';
import { OrgCollectionName } from '../../../global/support_user_team/org/constant';
import type { OrgSchemaType } from '../../../global/support_user_team/org/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';
import { OrgMemberCollectionName } from './orgMemberSchema';
import { getNanoid } from '../../../global/common/string/tools';
const { Schema } = connectionMongo;

export const OrgSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },
    pathId: {
      // path id, only used for path
      type: String,
      required: true,
      default: () => getNanoid()
    },
    path: {
      type: String,
      required: function (this: OrgSchemaType) {
        return typeof this.path !== 'string';
      } // allow empty string, but not null
    },
    name: {
      type: String,
      required: true
    },
    avatar: {
      type: String
    },
    description: String,
    updateTime: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    // Auto update updateTime
    timestamps: {
      updatedAt: 'updateTime'
    }
  }
);

OrgSchema.virtual('members', {
  ref: OrgMemberCollectionName,
  localField: '_id',
  foreignField: 'orgId',
  match: function (this: OrgSchemaType) {
    return { teamId: this.teamId };
  }
});

try {
  OrgSchema.index({
    teamId: 1,
    path: 1
  });
  OrgSchema.index(
    {
      teamId: 1,
      pathId: 1
    },
    {
      unique: true
    }
  );
} catch (error) {
  console.log(error);
}

export const MongoOrgModel = getMongoModel<OrgSchemaType>(OrgCollectionName, OrgSchema);
