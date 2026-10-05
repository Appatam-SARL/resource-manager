import type { Prisma } from '@prisma/client';

/** Convert a DTO/class instance to a plain JSON-safe object for audit metadata. */
export function toPlainJson(value: object): Prisma.InputJsonValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Prisma.InputJsonValue;
}
