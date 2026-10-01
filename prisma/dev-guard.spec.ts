import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkDevOnlyCommand } from './dev-guard';

const LOCAL_URL = 'postgresql://dev:dev@localhost:5432/resource_manager';
const REMOTE_URL = 'postgresql://user:secret@db.example-host.net:5432/prod';

describe('checkDevOnlyCommand', () => {
  it('allows destructive commands on a local development database', () => {
    assert.deepEqual(checkDevOnlyCommand('migrate-dev', { DATABASE_URL: LOCAL_URL }), { allowed: true });
    assert.deepEqual(
      checkDevOnlyCommand('seed', { DATABASE_URL: 'postgresql://u:p@postgres:5432/db', NODE_ENV: 'development' }),
      { allowed: true },
    );
  });

  for (const appEnv of ['staging', 'preprod', 'production', 'PRODUCTION']) {
    it(`refuses every command when APP_ENV=${appEnv}`, () => {
      const result = checkDevOnlyCommand('migrate-reset', { DATABASE_URL: LOCAL_URL, APP_ENV: appEnv });
      assert.equal(result.allowed, false);
    });
  }

  it('refuses when NODE_ENV=production', () => {
    assert.equal(checkDevOnlyCommand('db-push', { DATABASE_URL: LOCAL_URL, NODE_ENV: 'production' }).allowed, false);
  });

  it('refuses a remote database without explicit opt-in and never prints its host', () => {
    const result = checkDevOnlyCommand('seed', { DATABASE_URL: REMOTE_URL });
    assert.equal(result.allowed, false);
    assert.ok(!result.allowed && !result.reason.includes('example-host'));
    assert.ok(!result.allowed && !result.reason.includes('secret'));
  });

  it('accepts a remote development database only with ALLOW_REMOTE_DEV_DATABASE=true', () => {
    assert.deepEqual(
      checkDevOnlyCommand('migrate-dev', { DATABASE_URL: REMOTE_URL, ALLOW_REMOTE_DEV_DATABASE: 'true' }),
      { allowed: true },
    );
  });

  it('still refuses a remote opt-in in a protected environment', () => {
    const result = checkDevOnlyCommand('migrate-dev', {
      DATABASE_URL: REMOTE_URL,
      ALLOW_REMOTE_DEV_DATABASE: 'true',
      APP_ENV: 'production',
    });
    assert.equal(result.allowed, false);
  });

  it('refuses a missing or invalid DATABASE_URL', () => {
    assert.equal(checkDevOnlyCommand('seed', {}).allowed, false);
    assert.equal(checkDevOnlyCommand('seed', { DATABASE_URL: 'not a url' }).allowed, false);
  });
});
