/**
 * Passenger startup file for the API (cPanel "Setup Node.js App").
 * Copied into the application root by deploy-release.sh; it never contains secrets.
 *
 * Secrets live in <deploy root>/shared/api.env (chmod 600, outside the web root) and the code in
 * <deploy root>/api/current, a symlink switched atomically at each release.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { parseEnv } = require('node:util');

const deployRoot = process.env.RM_DEPLOY_ROOT || path.join(os.homedir(), 'resource-manager');
const envFile = path.join(deployRoot, 'shared', 'api.env');
const releaseDir = path.join(deployRoot, 'api', 'current');
const apiDir = path.join(releaseDir, 'apps', 'api');

// The env file wins over variables already set by the host (HOSTNAME, NODE_ENV, PORT…).
if (fs.existsSync(envFile)) {
  Object.assign(process.env, parseEnv(fs.readFileSync(envFile, 'utf8')));
}

// The running release, not the env file, is the source of truth for version information.
const release = JSON.parse(fs.readFileSync(path.join(releaseDir, 'release.json'), 'utf8'));
process.env.GIT_COMMIT_SHA = release.commit;
process.env.APP_VERSION = release.version;
process.env.BUILD_DATE = release.buildDate;

// Relative lookups (Nest ConfigModule .env files) resolve inside the release, never in the app root.
process.chdir(apiDir);

import(pathToFileURL(path.join(apiDir, 'dist', 'main.js')).href).catch((error) => {
  console.error('[startup] The API failed to start');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
