/**
 * 资源名称查询服务
 * 用于从 MongoDB 查询应用、数据集、成员、分组的真实名称
 */
import { connectionMongo, Types } from '../../common/mongo';
import { TeamMemberCollectionName } from '../../../global/support_user_team/constant';
import { MemberGroupCollectionName } from '../../../global/support_user_team/group/constant';

// MongoDB 集合名称（官方 FastGPT 定义）
const AppsCollectionName = 'apps';
const DatasetsCollectionName = 'datasets';
const TeamOrgsCollectionName = 'team_orgs';

/**
 * 根据 appId 查询应用名称和类型
 */
export async function getAppNameAndType(appId: string): Promise<{ name: string; type: string }> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return { name: appId, type: 'app' };
    }

    const app = await db.collection(AppsCollectionName).findOne(
      { _id: new Types.ObjectId(appId) },
      { projection: { name: 1, type: 1 } }
    );

    if (app) {
      return { name: app.name || appId, type: app.type || 'app' };
    }
    return { name: appId, type: 'app' };
  } catch (error) {
    console.error('getAppNameAndType error:', error);
    return { name: appId, type: 'app' };
  }
}

/**
 * 根据 datasetId 查询数据集名称和类型
 */
export async function getDatasetNameAndType(datasetId: string): Promise<{ name: string; type: string }> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return { name: datasetId, type: 'dataset' };
    }

    const dataset = await db.collection(DatasetsCollectionName).findOne(
      { _id: new Types.ObjectId(datasetId) },
      { projection: { name: 1, type: 1 } }
    );

    if (dataset) {
      return { name: dataset.name || datasetId, type: dataset.type || 'dataset' };
    }
    return { name: datasetId, type: 'dataset' };
  } catch (error) {
    console.error('getDatasetNameAndType error:', error);
    return { name: datasetId, type: 'dataset' };
  }
}

/**
 * 根据 tmbId 查询成员名称
 */
export async function getMemberName(tmbId: string): Promise<string> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return tmbId;
    }

    const member = await db.collection(TeamMemberCollectionName).findOne(
      { _id: new Types.ObjectId(tmbId) },
      { projection: { name: 1 } }
    );

    if (member) {
      return member.name || tmbId;
    }
    return tmbId;
  } catch (error) {
    console.error('getMemberName error:', error);
    return tmbId;
  }
}

/**
 * 根据 groupId 查询分组名称
 */
export async function getGroupName(groupId: string): Promise<string> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return groupId;
    }

    const group = await db.collection(MemberGroupCollectionName).findOne(
      { _id: new Types.ObjectId(groupId) },
      { projection: { name: 1 } }
    );

    if (group) {
      return group.name || groupId;
    }
    return groupId;
  } catch (error) {
    console.error('getGroupName error:', error);
    return groupId;
  }
}

/**
 * 根据 orgId 查询组织名称
 */
export async function getOrgName(orgId: string): Promise<string> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return orgId;
    }

    const org = await db.collection(TeamOrgsCollectionName).findOne(
      { _id: new Types.ObjectId(orgId) },
      { projection: { name: 1 } }
    );

    if (org) {
      return org.name || orgId;
    }
    return orgId;
  } catch (error) {
    console.error('getOrgName error:', error);
    return orgId;
  }
}

/**
 * 批量查询成员名称
 */
export async function getMemberNames(tmbIds: string[]): Promise<string[]> {
  if (!tmbIds || tmbIds.length === 0) return [];

  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return tmbIds;
    }

    const members = await db.collection(TeamMemberCollectionName).find(
      { _id: { $in: tmbIds.map(id => new Types.ObjectId(id)) } },
      { projection: { name: 1 } }
    ).toArray();

    // 创建 ID 到名称的映射
    const nameMap = new Map<string, string>();
    members.forEach(m => {
      nameMap.set(m._id.toString(), m.name || m._id.toString());
    });

    // 按原顺序返回名称
    return tmbIds.map(id => nameMap.get(id) || id);
  } catch (error) {
    console.error('getMemberNames error:', error);
    return tmbIds;
  }
}

/**
 * 批量查询分组名称
 */
export async function getGroupNames(groupIds: string[]): Promise<string[]> {
  if (!groupIds || groupIds.length === 0) return [];

  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return groupIds;
    }

    const groups = await db.collection(MemberGroupCollectionName).find(
      { _id: { $in: groupIds.map(id => new Types.ObjectId(id)) } },
      { projection: { name: 1 } }
    ).toArray();

    const nameMap = new Map<string, string>();
    groups.forEach(g => {
      nameMap.set(g._id.toString(), g.name || g._id.toString());
    });

    return groupIds.map(id => nameMap.get(id) || id);
  } catch (error) {
    console.error('getGroupNames error:', error);
    return groupIds;
  }
}

/**
 * 批量查询组织名称
 */
export async function getOrgNames(orgIds: string[]): Promise<string[]> {
  if (!orgIds || orgIds.length === 0) return [];

  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return orgIds;
    }

    const orgs = await db.collection(TeamOrgsCollectionName).find(
      { _id: { $in: orgIds.map(id => new Types.ObjectId(id)) } },
      { projection: { name: 1 } }
    ).toArray();

    const nameMap = new Map<string, string>();
    orgs.forEach(o => {
      nameMap.set(o._id.toString(), o.name || o._id.toString());
    });

    return orgIds.map(id => nameMap.get(id) || id);
  } catch (error) {
    console.error('getOrgNames error:', error);
    return orgIds;
  }
}
