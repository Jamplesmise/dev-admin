export enum AdminAuditEventEnum {
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_UPDATE_SYSTEM_MODAL = 'ADMIN_UPDATE_SYSTEM_MODAL',
  ADMIN_SEND_SYSTEM_INFORM = 'ADMIN_SEND_SYSTEM_INFORM',
  ADMIN_ADD_USER = 'ADMIN_ADD_USER',
  ADMIN_UPDATE_USER = 'ADMIN_UPDATE_USER',
  ADMIN_UPDATE_TEAM = 'ADMIN_UPDATE_TEAM',
  ADMIN_ADD_PLAN = 'ADMIN_ADD_PLAN',
  ADMIN_UPDATE_PLAN = 'ADMIN_UPDATE_PLAN',
  ADMIN_FINISH_INVOICE = 'ADMIN_FINISH_INVOICE',
  ADMIN_UPDATE_SYSTEM_CONFIG = 'ADMIN_UPDATE_SYSTEM_CONFIG',
  ADMIN_CREATE_APP_TEMPLATE = 'ADMIN_CREATE_APP_TEMPLATE',
  ADMIN_UPDATE_APP_TEMPLATE = 'ADMIN_UPDATE_APP_TEMPLATE',
  ADMIN_DELETE_APP_TEMPLATE = 'ADMIN_DELETE_APP_TEMPLATE',
  ADMIN_SAVE_TEMPLATE_TYPE = 'ADMIN_SAVE_TEMPLATE_TYPE',
  ADMIN_DELETE_TEMPLATE_TYPE = 'ADMIN_DELETE_TEMPLATE_TYPE',
  ADMIN_CREATE_PLUGIN = 'ADMIN_CREATE_PLUGIN',
  ADMIN_UPDATE_PLUGIN = 'ADMIN_UPDATE_PLUGIN',
  ADMIN_DELETE_PLUGIN = 'ADMIN_DELETE_PLUGIN',
  ADMIN_CREATE_PLUGIN_GROUP = 'ADMIN_CREATE_PLUGIN_GROUP',
  ADMIN_UPDATE_PLUGIN_GROUP = 'ADMIN_UPDATE_PLUGIN_GROUP',
  ADMIN_DELETE_PLUGIN_GROUP = 'ADMIN_DELETE_PLUGIN_GROUP'
}

export enum AuditEventEnum {
  //Team
  LOGIN = 'LOGIN',
  CREATE_INVITATION_LINK = 'CREATE_INVITATION_LINK',
  JOIN_TEAM = 'JOIN_TEAM',
  CHANGE_MEMBER_NAME = 'CHANGE_MEMBER_NAME',
  KICK_OUT_TEAM = 'KICK_OUT_TEAM',
  RECOVER_TEAM_MEMBER = 'RECOVER_TEAM_MEMBER',
  CREATE_DEPARTMENT = 'CREATE_DEPARTMENT',
  CHANGE_DEPARTMENT = 'CHANGE_DEPARTMENT',
  DELETE_DEPARTMENT = 'DELETE_DEPARTMENT',
  RELOCATE_DEPARTMENT = 'RELOCATE_DEPARTMENT',
  CREATE_GROUP = 'CREATE_GROUP',
  DELETE_GROUP = 'DELETE_GROUP',
  ASSIGN_PERMISSION = 'ASSIGN_PERMISSION',
  //APP
  CREATE_APP = 'CREATE_APP',
  UPDATE_APP_INFO = 'UPDATE_APP_INFO',
  MOVE_APP = 'MOVE_APP',
  DELETE_APP = 'DELETE_APP',
  UPDATE_APP_COLLABORATOR = 'UPDATE_APP_COLLABORATOR',
  DELETE_APP_COLLABORATOR = 'DELETE_APP_COLLABORATOR',
  TRANSFER_APP_OWNERSHIP = 'TRANSFER_APP_OWNERSHIP',
  CREATE_APP_COPY = 'CREATE_APP_COPY',
  CREATE_APP_FOLDER = 'CREATE_APP_FOLDER',
  UPDATE_PUBLISH_APP = 'UPDATE_PUBLISH_APP',
  CREATE_APP_PUBLISH_CHANNEL = 'CREATE_APP_PUBLISH_CHANNEL',
  UPDATE_APP_PUBLISH_CHANNEL = 'UPDATE_APP_PUBLISH_CHANNEL',
  DELETE_APP_PUBLISH_CHANNEL = 'DELETE_APP_PUBLISH_CHANNEL',
  EXPORT_APP_CHAT_LOG = 'EXPORT_APP_CHAT_LOG',
  CREATE_EVALUATION = 'CREATE_EVALUATION',
  EXPORT_EVALUATION = 'EXPORT_EVALUATION',
  DELETE_EVALUATION = 'DELETE_EVALUATION',
  //Dataset
  CREATE_DATASET = 'CREATE_DATASET',
  UPDATE_DATASET = 'UPDATE_DATASET',
  DELETE_DATASET = 'DELETE_DATASET',
  MOVE_DATASET = 'MOVE_DATASET',
  UPDATE_DATASET_COLLABORATOR = 'UPDATE_DATASET_COLLABORATOR',
  DELETE_DATASET_COLLABORATOR = 'DELETE_DATASET_COLLABORATOR',
  TRANSFER_DATASET_OWNERSHIP = 'TRANSFER_DATASET_OWNERSHIP',
  EXPORT_DATASET = 'EXPORT_DATASET',
  CREATE_DATASET_FOLDER = 'CREATE_DATASET_FOLDER',
  //Collection
  CREATE_COLLECTION = 'CREATE_COLLECTION',
  UPDATE_COLLECTION = 'UPDATE_COLLECTION',
  DELETE_COLLECTION = 'DELETE_COLLECTION',
  RETRAIN_COLLECTION = 'RETRAIN_COLLECTION',
  //Data
  CREATE_DATA = 'CREATE_DATA',
  UPDATE_DATA = 'UPDATE_DATA',
  DELETE_DATA = 'DELETE_DATA',
  //SearchTest
  SEARCH_TEST = 'SEARCH_TEST',
  //Account
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  CHANGE_NOTIFICATION_SETTINGS = 'CHANGE_NOTIFICATION_SETTINGS',
  CHANGE_MEMBER_NAME_ACCOUNT = 'CHANGE_MEMBER_NAME_ACCOUNT',
  PURCHASE_PLAN = 'PURCHASE_PLAN',
  EXPORT_BILL_RECORDS = 'EXPORT_BILL_RECORDS',
  CREATE_INVOICE = 'CREATE_INVOICE',
  SET_INVOICE_HEADER = 'SET_INVOICE_HEADER',
  CREATE_API_KEY = 'CREATE_API_KEY',
  UPDATE_API_KEY = 'UPDATE_API_KEY',
  DELETE_API_KEY = 'DELETE_API_KEY'
}

// 每个事件的具体参数类型定义
export type AuditEventParamsType = {
  [AuditEventEnum.LOGIN]: { name?: string };
  [AuditEventEnum.CREATE_INVITATION_LINK]: { name?: string; link: string };
  [AuditEventEnum.JOIN_TEAM]: { name?: string; link: string };
  [AuditEventEnum.CHANGE_MEMBER_NAME]: { name?: string; memberName: string; newName: string };
  [AuditEventEnum.KICK_OUT_TEAM]: { name?: string; memberName: string };
  [AuditEventEnum.RECOVER_TEAM_MEMBER]: { name?: string; memberName: string };
  [AuditEventEnum.CREATE_DEPARTMENT]: { name?: string; departmentName: string };
  [AuditEventEnum.CHANGE_DEPARTMENT]: { name?: string; departmentName: string };
  [AuditEventEnum.DELETE_DEPARTMENT]: { name?: string; departmentName: string };
  [AuditEventEnum.RELOCATE_DEPARTMENT]: { name?: string; departmentName: string };
  [AuditEventEnum.CREATE_GROUP]: { name?: string; groupName: string };
  [AuditEventEnum.DELETE_GROUP]: { name?: string; groupName: string };
  [AuditEventEnum.ASSIGN_PERMISSION]: { name?: string; objectName: string; permission: string };
  [AuditEventEnum.CREATE_APP]: { name?: string; appName: string; appType: string };
  [AuditEventEnum.UPDATE_APP_INFO]: {
    name?: string;
    appName: string;
    newItemNames: string[];
    newItemValues: string[];
    appType: string;
  };
  [AuditEventEnum.MOVE_APP]: { name?: string; appName: string; targetFolderName: string; appType: string };
  [AuditEventEnum.DELETE_APP]: { name?: string; appName: string; appType: string };
  [AuditEventEnum.UPDATE_APP_COLLABORATOR]: {
    name?: string;
    appName: string;
    appType: string;
    tmbList: string[];
    groupList: string[];
    orgList: string[];
    permission: string;
  };
  [AuditEventEnum.DELETE_APP_COLLABORATOR]: {
    name?: string;
    appName: string;
    appType: string;
    itemName: string;
    itemValueName: string;
  };
  [AuditEventEnum.TRANSFER_APP_OWNERSHIP]: {
    name?: string;
    appName: string;
    appType: string;
    oldOwnerName: string;
    newOwnerName: string;
  };
  [AuditEventEnum.CREATE_APP_COPY]: { name?: string; appName: string; appType: string };
  [AuditEventEnum.CREATE_APP_FOLDER]: { name?: string; folderName: string };
  [AuditEventEnum.UPDATE_PUBLISH_APP]: {
    name?: string;
    operationName: string;
    appName: string;
    appId: string;
    appType: string;
  };
  [AuditEventEnum.CREATE_APP_PUBLISH_CHANNEL]: { name?: string; appName: string; channelName: string; appType: string };
  [AuditEventEnum.UPDATE_APP_PUBLISH_CHANNEL]: { name?: string; appName: string; channelName: string; appType: string };
  [AuditEventEnum.DELETE_APP_PUBLISH_CHANNEL]: { name?: string; appName: string; channelName: string; appType: string };
  [AuditEventEnum.EXPORT_APP_CHAT_LOG]: { name?: string; appName: string; appType: string };
  [AuditEventEnum.CREATE_EVALUATION]: { name: string; appName: string };
  [AuditEventEnum.EXPORT_EVALUATION]: { name: string };
  [AuditEventEnum.DELETE_EVALUATION]: { name?: string };
  [AuditEventEnum.CREATE_DATASET]: { name?: string; datasetName: string; datasetType: string };
  [AuditEventEnum.UPDATE_DATASET]: { name?: string; datasetName: string; datasetType: string };
  [AuditEventEnum.DELETE_DATASET]: { name?: string; datasetName: string; datasetType: string };
  [AuditEventEnum.MOVE_DATASET]: {
    name?: string;
    datasetName: string;
    targetFolderName: string;
    datasetType: string;
  };
  [AuditEventEnum.UPDATE_DATASET_COLLABORATOR]: {
    name?: string;
    datasetName: string;
    datasetType: string;
    tmbList: string[];
    groupList: string[];
    orgList: string[];
    permission: string;
  };
  [AuditEventEnum.DELETE_DATASET_COLLABORATOR]: {
    name?: string;
    datasetName: string;
    datasetType: string;
    itemName: string;
    itemValueName: string;
  };
  [AuditEventEnum.TRANSFER_DATASET_OWNERSHIP]: {
    name?: string;
    datasetName: string;
    datasetType: string;
    oldOwnerName: string;
    newOwnerName: string;
  };
  [AuditEventEnum.EXPORT_DATASET]: { name?: string; datasetName: string; datasetType: string };
  [AuditEventEnum.CREATE_DATASET_FOLDER]: { name?: string; folderName: string };
  [AuditEventEnum.CREATE_COLLECTION]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.UPDATE_COLLECTION]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.DELETE_COLLECTION]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.RETRAIN_COLLECTION]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.CREATE_DATA]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.UPDATE_DATA]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.DELETE_DATA]: {
    name?: string;
    collectionName: string;
    datasetName: string;
    datasetType: string;
  };
  [AuditEventEnum.SEARCH_TEST]: { name?: string; datasetName: string; datasetType: string };
  [AuditEventEnum.CHANGE_PASSWORD]: { name?: string };
  [AuditEventEnum.CHANGE_NOTIFICATION_SETTINGS]: { name?: string };
  [AuditEventEnum.CHANGE_MEMBER_NAME_ACCOUNT]: { name?: string; oldName: string; newName: string };
  [AuditEventEnum.PURCHASE_PLAN]: { name?: string };
  [AuditEventEnum.EXPORT_BILL_RECORDS]: { name?: string };
  [AuditEventEnum.CREATE_INVOICE]: { name?: string };
  [AuditEventEnum.SET_INVOICE_HEADER]: { name?: string };
  [AuditEventEnum.CREATE_API_KEY]: { name?: string; keyName: string };
  [AuditEventEnum.UPDATE_API_KEY]: { name?: string; keyName: string };
  [AuditEventEnum.DELETE_API_KEY]: { name?: string; keyName: string };
};

export type AdminAuditEventParamsType = {
  [AdminAuditEventEnum.ADMIN_LOGIN]: { name?: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_SYSTEM_MODAL]: { name?: string };
  [AdminAuditEventEnum.ADMIN_SEND_SYSTEM_INFORM]: { name?: string; informTitle?: string; level?: string };
  [AdminAuditEventEnum.ADMIN_ADD_USER]: { name?: string; userName: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_USER]: { userName?: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_TEAM]: { name?: string; teamName: string; newTeamName: string; newBalance: string };
  [AdminAuditEventEnum.ADMIN_ADD_PLAN]: { name?: string; teamId: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_PLAN]: { name?: string; teamId: string };
  [AdminAuditEventEnum.ADMIN_FINISH_INVOICE]: { name?: string; teamName: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_SYSTEM_CONFIG]: { name?: string };
  [AdminAuditEventEnum.ADMIN_CREATE_APP_TEMPLATE]: { name?: string; templateName: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_APP_TEMPLATE]: { name?: string; templateName: string };
  [AdminAuditEventEnum.ADMIN_DELETE_APP_TEMPLATE]: { name?: string; templateName: string };
  [AdminAuditEventEnum.ADMIN_SAVE_TEMPLATE_TYPE]: { name?: string; typeName: string };
  [AdminAuditEventEnum.ADMIN_DELETE_TEMPLATE_TYPE]: { name?: string; typeName: string };
  [AdminAuditEventEnum.ADMIN_CREATE_PLUGIN]: { name?: string; pluginName: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_PLUGIN]: { name?: string; pluginName: string };
  [AdminAuditEventEnum.ADMIN_DELETE_PLUGIN]: { name?: string; pluginName: string };
  [AdminAuditEventEnum.ADMIN_CREATE_PLUGIN_GROUP]: { name?: string; groupName: string };
  [AdminAuditEventEnum.ADMIN_UPDATE_PLUGIN_GROUP]: { name?: string; groupName: string };
  [AdminAuditEventEnum.ADMIN_DELETE_PLUGIN_GROUP]: { name?: string; groupName: string };
};
