import { PermissionAction } from '../constants';

export type PermissionsMap = Record<string, PermissionAction[]>;

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  permissions: PermissionsMap;
}
