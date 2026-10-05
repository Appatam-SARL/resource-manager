/**
 * Usage: tsx prisma/dev-guard-cli.ts <migrate-dev|db-push|migrate-reset|seed>
 * Exits with code 1 when the command must not run against the configured database.
 */
import { existsSync } from 'node:fs';
import { assertDevOnlyCommand, type DevOnlyCommand } from './dev-guard';

const COMMANDS: readonly DevOnlyCommand[] = ['migrate-dev', 'db-push', 'migrate-reset', 'seed'];

const command = process.argv[2] as DevOnlyCommand | undefined;
if (!command || !COMMANDS.includes(command)) {
  console.error(`[dev-guard] Commande attendue : ${COMMANDS.join(' | ')}`);
  process.exit(1);
}

// Same source as the Prisma CLI; variables already set in the shell take precedence.
if (existsSync('.env')) process.loadEnvFile('.env');

try {
  assertDevOnlyCommand(command);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
