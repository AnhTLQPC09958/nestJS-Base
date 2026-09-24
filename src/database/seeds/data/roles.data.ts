/**
 * Role mặc định.
 * ADMIN → gán hết mọi permission ở DEFAULT_PERMISSIONS.
 */
export const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Quản trị viên — toàn quyền hệ thống',
  },
] as const;

/**
 * User admin mặc định để login lần đầu.
 */
export const DEFAULT_ADMIN_USER = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'Admin@123',
} as const;
