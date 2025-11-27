/**
 * 权限控制器统一导出
 */
export {
  getTeamMemberPermission,
  calculatePermission,
  hasPermission,
  hasReadPermission,
  hasWritePermission,
  hasManagePermission,
  getCollaboratorList,
  deleteResourceCollaborators,
  updateCollaborators,
  deleteCollaborators,
  type UpdateCollaboratorInput,
  type UpdateCollaboratorResult
} from './collaborator/controller';
