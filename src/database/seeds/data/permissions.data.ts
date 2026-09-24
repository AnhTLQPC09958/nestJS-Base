import { PermissionAction } from '../../../common/constants';

/**
 * Danh sách permission mặc định cho core.
 * Khi thêm module mới → bổ sung vào đây.
 */
export const DEFAULT_MODULES = ['nguoi-dung', 'vai-tro'] as const;

export const DEFAULT_ACTIONS: PermissionAction[] = [
  PermissionAction.INDEX,
  PermissionAction.SHOW,
  PermissionAction.CREATE,
  PermissionAction.EDIT,
  PermissionAction.DELETE,
];

/**
 * Flatten thành list { moduleKey, action } để insert.
 * VD: [{ moduleKey: 'nguoi-dung', action: 'index' }, ...]
 */
export const DEFAULT_PERMISSIONS = DEFAULT_MODULES.flatMap((moduleKey) =>
  DEFAULT_ACTIONS.map((action) => ({ moduleKey, action })),
);
