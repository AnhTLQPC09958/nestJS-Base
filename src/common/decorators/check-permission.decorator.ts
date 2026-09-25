import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../constants';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
}

/**
 * Yêu cầu quyền cho endpoint.
 * VD: @CheckPermission('nguoi-dung', PermissionAction.CREATE)
 */
export const CheckPermission = (module: string, action: PermissionAction) => {
  return SetMetadata(PERMISSION_KEY, { module, action });
};
