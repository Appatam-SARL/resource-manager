/**
 * Deployment settings resolved when the server renders a request, not at build time,
 * so a single admin image can be promoted from staging to production.
 */
export type DeploymentEnvironment =
  | 'development'
  | 'test'
  | 'staging'
  | 'preprod'
  | 'production';

export interface RuntimeConfig {
  /** null → use the build-time NEXT_PUBLIC_API_URL; '' → same origin (reverse proxy). */
  apiUrl: string | null;
  environment: DeploymentEnvironment;
  version: string;
  commit: string;
}

export const RUNTIME_CONFIG_GLOBAL = '__RM_RUNTIME_CONFIG__';

const ENVIRONMENTS: readonly DeploymentEnvironment[] = [
  'development',
  'test',
  'staging',
  'preprod',
  'production',
];

type EnvSource = Record<string, string | undefined>;

export function readServerRuntimeConfig(env: EnvSource = process.env): RuntimeConfig {
  const environment = ENVIRONMENTS.find((value) => value === env.APP_ENV) ?? 'development';
  const apiUrl = env.API_PUBLIC_URL;
  return {
    apiUrl: apiUrl === undefined ? null : apiUrl.trim().replace(/\/$/, ''),
    environment,
    version: env.APP_VERSION || 'dev',
    // Docker images receive GIT_COMMIT_SHA at build time; Vercel exposes VERCEL_GIT_COMMIT_SHA.
    commit: env.GIT_COMMIT_SHA || env.VERCEL_GIT_COMMIT_SHA || 'local',
  };
}

/** Inline script payload; `<` is escaped so the JSON can never close the script tag. */
export function serializeRuntimeConfig(config: RuntimeConfig): string {
  return `window.${RUNTIME_CONFIG_GLOBAL}=${JSON.stringify(config).replace(/</g, '\\u003c')};`;
}

export function getBrowserRuntimeConfig(): RuntimeConfig | null {
  if (typeof window === 'undefined') return null;
  const value = (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL];
  return value && typeof value === 'object' ? (value as RuntimeConfig) : null;
}

export function isNonProductionEnvironment(
  environment: DeploymentEnvironment,
): environment is 'staging' | 'preprod' {
  return environment === 'staging' || environment === 'preprod';
}

export function formatBuildLabel(config: Pick<RuntimeConfig, 'version' | 'commit'>): string {
  return `v${config.version} · ${config.commit.slice(0, 7)}`;
}
