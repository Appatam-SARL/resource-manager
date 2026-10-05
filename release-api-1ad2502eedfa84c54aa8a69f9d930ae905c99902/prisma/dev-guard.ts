/**
 * Guard for destructive development-only database commands
 * (prisma migrate dev, prisma db push, prisma migrate reset, the seed which wipes every table).
 * Staging, preprod and production only ever run `prisma migrate deploy`.
 */

export type DevOnlyCommand = 'migrate-dev' | 'db-push' | 'migrate-reset' | 'seed';

const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  // Local Docker stack (docker-compose.yml)
  'postgres',
  'host.docker.internal',
]);

const PROTECTED_APP_ENVS = new Set(['staging', 'preprod', 'production']);

type EnvSource = Record<string, string | undefined>;

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

export function checkDevOnlyCommand(command: DevOnlyCommand, env: EnvSource): GuardResult {
  const appEnv = env.APP_ENV?.trim().toLowerCase();
  if (appEnv && PROTECTED_APP_ENVS.has(appEnv)) {
    return { allowed: false, reason: `APP_ENV=${appEnv} : « ${command} » est interdit hors développement.` };
  }
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    return { allowed: false, reason: `NODE_ENV=production : « ${command} » est interdit.` };
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return { allowed: false, reason: 'DATABASE_URL est absent.' };
  }
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    return { allowed: false, reason: 'DATABASE_URL est invalide.' };
  }
  if (!LOCAL_DATABASE_HOSTS.has(hostname) && env.ALLOW_REMOTE_DEV_DATABASE !== 'true') {
    // The hostname is deliberately not printed: remote URLs may identify real infrastructure.
    return {
      allowed: false,
      reason:
        `La base ciblée n'est pas locale : « ${command} » est refusé. ` +
        'Pour une base de développement distante, définissez ALLOW_REMOTE_DEV_DATABASE=true.',
    };
  }
  return { allowed: true };
}

export function assertDevOnlyCommand(command: DevOnlyCommand, env: EnvSource = process.env): void {
  const result = checkDevOnlyCommand(command, env);
  if (!result.allowed) {
    throw new Error(`[dev-guard] ${result.reason}`);
  }
}
