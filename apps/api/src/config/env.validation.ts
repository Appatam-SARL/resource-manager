import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** Deployment target, distinct from NODE_ENV: staging and preprod run with NODE_ENV=production. */
export enum AppEnv {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Preprod = 'preprod',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsEnum(AppEnv)
  @IsOptional()
  APP_ENV: AppEnv = AppEnv.Development;

  @IsString()
  @IsOptional()
  APP_VERSION?: string;

  @IsString()
  @IsOptional()
  GIT_COMMIT_SHA?: string;

  @IsString()
  @IsOptional()
  BUILD_DATE?: string;

  /** Number of reverse proxies in front of the API (Caddy, Render…), used to resolve the client IP. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  TRUST_PROXY_HOPS: number = 0;

  @IsString()
  @IsOptional()
  PORT = '3000';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  /** Comma-separated browser origins allowed on the WebSocket; defaults to CORS_ORIGIN. */
  @IsString()
  @IsOptional()
  WS_ALLOWED_ORIGINS?: string;

  /** Only required when "Enhanced Push Security" is enabled on the Expo account. */
  @IsString()
  @IsOptional()
  EXPO_ACCESS_TOKEN?: string;

  /** Outgoing mail (password reset codes). Required when APP_ENV=production. */
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  SMTP_PORT?: number;

  /** "true" for implicit TLS (port 465), "false" for STARTTLS (port 587). */
  @IsIn(['true', 'false'])
  @IsOptional()
  SMTP_SECURE?: 'true' | 'false';

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM?: string;
}

const SMTP_REQUIRED_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'MAIL_FROM',
] as const satisfies readonly (keyof EnvironmentVariables)[];

function findMissingSmtpKeys(env: EnvironmentVariables): string[] {
  if (env.APP_ENV !== AppEnv.Production) return [];
  return SMTP_REQUIRED_KEYS.filter((key) => {
    const value = env[key];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  const missingSmtpKeys = findMissingSmtpKeys(validated);
  if (missingSmtpKeys.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${missingSmtpKeys.join(', ')} required when APP_ENV=production`,
    );
  }

  return validated;
}
