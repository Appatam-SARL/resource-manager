import { BadRequestException, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

/** bcrypt ignores everything after 72 bytes: longer passwords are refused, never truncated. */
export const PASSWORD_MAX_BYTES = 72;
const BCRYPT_COST = 12;

@Injectable()
export class PasswordService {
  async hash(plainPassword: string): Promise<string> {
    if (Buffer.byteLength(plainPassword, 'utf8') > PASSWORD_MAX_BYTES) {
      throw new BadRequestException(
        'Le mot de passe est trop long (72 caractères maximum, moins avec des accents ou symboles).',
      );
    }
    return hash(plainPassword, BCRYPT_COST);
  }

  async verify(
    passwordHash: string,
    plainPassword: string,
  ): Promise<boolean> {
    if (Buffer.byteLength(plainPassword, 'utf8') > PASSWORD_MAX_BYTES) {
      return false;
    }
    try {
      return await compare(plainPassword, passwordHash);
    } catch {
      return false;
    }
  }
}
