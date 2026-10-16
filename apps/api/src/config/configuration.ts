export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  realtime: {
    allowedOrigins: process.env.WS_ALLOWED_ORIGINS || undefined,
  },
  expoPush: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
  },
  mail: {
    host: process.env.SMTP_HOST || undefined,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from: process.env.MAIL_FROM || undefined,
  },
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? '0', 10),
  deployment: {
    environment: process.env.APP_ENV ?? 'development',
    version: process.env.APP_VERSION || 'dev',
    commit: process.env.GIT_COMMIT_SHA || 'local',
    buildDate: process.env.BUILD_DATE || undefined,
  },
});
