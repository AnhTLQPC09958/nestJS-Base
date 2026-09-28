import { PermissionAction } from '../constants';

export type PermissionsMap = Record<string, PermissionAction[]>;

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  deviceId: string;
  avatarUrl?: string;
  permissions: PermissionsMap;
  role?: string;
}
