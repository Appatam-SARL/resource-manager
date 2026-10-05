import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes with bcrypt (cost 12) and verifies the original password only', async () => {
    const passwordHash = await service.hash('Password123!');

    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(passwordHash).not.toContain('Password123!');
    await expect(service.verify(passwordHash, 'Password123!')).resolves.toBe(true);
    await expect(service.verify(passwordHash, 'password123!')).resolves.toBe(false);
  });

  it('refuses passwords longer than 72 bytes instead of silently truncating them', async () => {
    await expect(service.hash('a'.repeat(73))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.hash('é'.repeat(37))).rejects.toBeInstanceOf(BadRequestException);

    const passwordHash = await service.hash('a'.repeat(72));
    await expect(service.verify(passwordHash, 'a'.repeat(72))).resolves.toBe(true);
    await expect(service.verify(passwordHash, `${'a'.repeat(72)}suffix`)).resolves.toBe(false);
  });

  it('returns false for a malformed or legacy (argon2) hash', async () => {
    await expect(service.verify('not-a-hash', 'Password123!')).resolves.toBe(false);
    await expect(
      service.verify('$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA', 'Password123!'),
    ).resolves.toBe(false);
  });
});
