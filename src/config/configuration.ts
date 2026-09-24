/**
 * Factory trả về object config đã được nhóm theo domain.
 * Cách dùng: configService.get('database.host')
 */
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
});
