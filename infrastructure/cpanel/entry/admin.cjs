/**
 * Passenger startup file for the admin (cPanel "Setup Node.js App").
 * Copied into the application root by deploy-release.sh; it never contains secrets.
 *
 * Settings live in <deploy root>/shared/admin.env and the Next.js standalone build in
 * <deploy root>/admin/current, a symlink switched atomically at each release.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseEnv } = require('node:util');

const deployRoot = process.env.RM_DEPLOY_ROOT || path.join(os.homedir(), 'resource-manager');
const envFile = path.join(deployRoot, 'shared', 'admin.env');
const releaseDir = path.join(deployRoot, 'admin', 'current');
const adminDir = path.join(releaseDir, 'apps', 'admin');

// The env file wins over variables already set by the host (HOSTNAME, NODE_ENV, PORT…).
if (fs.existsSync(envFile)) {
  Object.assign(process.env, parseEnv(fs.readFileSync(envFile, 'utf8')));
}
process.env.NODE_ENV = 'production';

// The running release, not the env file, is the source of truth for version information.
const release = JSON.parse(fs.readFileSync(path.join(releaseDir, 'release.json'), 'utf8'));
process.env.GIT_COMMIT_SHA = release.commit;
process.env.APP_VERSION = release.version;

process.chdir(adminDir);
require(path.join(adminDir, 'server.js'));
