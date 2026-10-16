import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MailService } from './mail.service.js';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}));

type MailSettings = {
  host?: string;
  port?: number;
  secure: boolean;
  user?: string;
  password?: string;
  from?: string;
};

const SMTP: MailSettings = {
  host: 'mail.example.test',
  port: 465,
  secure: true,
  user: 'no-reply@example.test',
  password: 'secret',
  from: 'Resource Manager <no-reply@example.test>',
};

function buildService(environment: string, mail: MailSettings) {
  const config = {
    get: vi.fn((key: string) => (key === 'mail' ? mail : key === 'deployment.environment' ? environment : undefined)),
  };
  return new MailService(config as unknown as ConfigService);
}

describe('MailService', () => {
  let logged: string[];

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logged.push(String(message));
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the code by SMTP with the French subject', async () => {
    await buildService('production', SMTP).sendPasswordResetCode('user@example.test', '482913', 15);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.test',
        from: SMTP.from,
        subject: 'Code de réinitialisation Resource Manager',
        text: expect.stringContaining('482913'),
        html: expect.stringContaining('482913'),
      }),
    );
    expect(logged.join(' ')).not.toContain('482913');
  });

  it('logs the code instead of sending in development without SMTP', async () => {
    await buildService('development', { secure: false }).sendPasswordResetCode('user@example.test', '482913', 15);

    expect(sendMail).not.toHaveBeenCalled();
    expect(logged.join(' ')).toContain('482913');
  });

  it.each(['production', 'preprod', 'staging'])(
    'never logs the code in %s, even without SMTP',
    async (environment) => {
      await expect(
        buildService(environment, { secure: false }).sendPasswordResetCode('user@example.test', '482913', 15),
      ).rejects.toThrow('SMTP is not configured');

      expect(sendMail).not.toHaveBeenCalled();
      expect(logged.join(' ')).not.toContain('482913');
    },
  );
});
