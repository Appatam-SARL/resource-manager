import { randomUUID } from 'node:crypto';
import { EntityStatus, ReservationStatus, ResourceStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../src/modules/auth/types/authenticated-user.type.js';

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return new Date(a as Date).getTime() === new Date(b as Date).getTime();
  }
  return a === b;
}

function compare(a: unknown, b: unknown): number {
  return new Date(a as Date).getTime() - new Date(b as Date).getTime();
}

const OPERATORS = new Set(['in', 'lt', 'gt', 'not', 'equals']);

/** Subset of the Prisma `where` language used by the services under test. */
export function matchesWhere(row: Row, where: Where | undefined): boolean {
  for (const [key, condition] of Object.entries(where ?? {})) {
    if (condition === undefined) continue;
    if (key === 'AND') {
      if (!(condition as Where[]).every((w) => matchesWhere(row, w))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!(condition as Where[]).some((w) => matchesWhere(row, w))) return false;
      continue;
    }
    const value = row[key];
    if (condition === null || typeof condition !== 'object' || condition instanceof Date) {
      if (!sameValue(value, condition)) return false;
      continue;
    }
    const ops = condition as Record<string, unknown>;
    if (Object.keys(ops).some((op) => OPERATORS.has(op))) {
      if ('equals' in ops && !sameValue(value, ops.equals)) return false;
      if ('in' in ops && !(ops.in as unknown[]).some((v) => sameValue(value, v))) return false;
      if ('not' in ops && sameValue(value, ops.not)) return false;
      if ('lt' in ops && !(compare(value, ops.lt) < 0)) return false;
      if ('gt' in ops && !(compare(value, ops.gt) > 0)) return false;
      continue;
    }
    if (value === null || typeof value !== 'object' || !matchesWhere(value as Row, ops)) return false;
  }
  return true;
}

function withoutUndefined(data: Row): Row {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

export interface InMemoryPrismaOptions {
  /** Emulates `pg_advisory_xact_lock`; disabled only to prove the concurrency test is meaningful. */
  honorAdvisoryLocks?: boolean;
}

/**
 * In-memory stand-in for PrismaService: enough for auth, users, reservations and
 * notifications flows. Each operation yields to the event loop so concurrent
 * requests interleave like they would against PostgreSQL.
 */
export class InMemoryPrisma {
  readonly companies = new Map<string, Row>();
  readonly directions = new Map<string, Row>();
  readonly users = new Map<string, Row>();
  readonly vehicles = new Map<string, Row>();
  readonly reservations = new Map<string, Row>();
  readonly notifications: Row[] = [];
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly options: InMemoryPrismaOptions = {}) {}

  seedCompany(company: { id: string; name: string }, status: EntityStatus = EntityStatus.ACTIVE) {
    this.companies.set(company.id, { ...company, status });
  }

  seedDirection(direction: { id: string; name: string }) {
    this.directions.set(direction.id, { ...direction });
  }

  seedUser(user: AuthenticatedUser) {
    const { company: _company, direction: _direction, ...row } = user;
    this.users.set(user.id, { ...row });
  }

  seedVehicle(vehicle: { id: string; companyId: string; registrationNumber: string; seats: number }) {
    this.vehicles.set(vehicle.id, {
      ...vehicle,
      brand: 'Toyota',
      model: 'Corolla',
      status: ResourceStatus.AVAILABLE,
    });
  }

  private companyRef(id: unknown) {
    const company = this.companies.get(id as string);
    return company ? { id: company.id, name: company.name, status: company.status } : null;
  }

  private directionRef(id: unknown) {
    const direction = this.directions.get(id as string);
    return direction ? { id: direction.id, name: direction.name } : null;
  }

  private hydrateUser(row: Row): Row {
    return { ...row, company: this.companyRef(row.companyId), direction: this.directionRef(row.directionId) };
  }

  private hydrateVehicle(row: Row): Row {
    return { ...row, company: this.companyRef(row.companyId) };
  }

  private hydrateReservation(row: Row): Row {
    const user = this.users.get(row.userId as string);
    const vehicle = row.vehicleId ? this.vehicles.get(row.vehicleId as string) : undefined;
    return {
      ...row,
      company: this.companyRef(row.companyId),
      direction: this.directionRef(row.directionId),
      user: user
        ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, directionId: user.directionId }
        : null,
      vehicle: vehicle
        ? { id: vehicle.id, registrationNumber: vehicle.registrationNumber, brand: vehicle.brand, model: vehicle.model, seats: vehicle.seats, status: vehicle.status }
        : null,
      room: null,
    };
  }

  private findReservations(where?: Where): Row[] {
    return [...this.reservations.values()]
      .map((row) => this.hydrateReservation(row))
      .filter((row) => matchesWhere(row, where));
  }

  readonly user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      await tick();
      const row = where.id
        ? this.users.get(where.id)
        : [...this.users.values()].find((u) => u.email === where.email);
      return row ? this.hydrateUser(row) : null;
    },
    findMany: async ({ where }: { where?: Where }) => {
      await tick();
      return [...this.users.values()].map((u) => this.hydrateUser(u)).filter((u) => matchesWhere(u, where));
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      await tick();
      const row = this.users.get(where.id);
      if (!row) throw new Error('Record to update not found.');
      Object.assign(row, withoutUndefined(data), { updatedAt: new Date() });
      return this.hydrateUser(row);
    },
  };

  readonly vehicle = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      await tick();
      const row = this.vehicles.get(where.id);
      return row ? this.hydrateVehicle(row) : null;
    },
  };

  readonly reservation = {
    findMany: async ({ where, skip, take }: { where?: Where; skip?: number; take?: number }) => {
      await tick();
      const rows = this.findReservations(where);
      return rows.slice(skip ?? 0, take === undefined ? undefined : (skip ?? 0) + take);
    },
    count: async ({ where }: { where?: Where }) => {
      await tick();
      return this.findReservations(where).length;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      await tick();
      const row = this.reservations.get(where.id);
      return row ? this.hydrateReservation(row) : null;
    },
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      await tick();
      const row = this.reservations.get(where.id);
      if (!row) throw new Error('No Reservation found');
      return this.hydrateReservation(row);
    },
    create: async ({ data }: { data: Row }) => {
      await tick();
      const now = new Date();
      const row: Row = {
        vehicleId: null,
        roomId: null,
        destination: null,
        missionReason: null,
        passengerCount: null,
        meetingSubject: null,
        participantCount: null,
        comment: null,
        rejectionReason: null,
        status: ReservationStatus.PENDING,
        ...withoutUndefined(data),
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      this.reservations.set(row.id as string, row);
      return this.hydrateReservation(row);
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      await tick();
      const row = this.reservations.get(where.id);
      if (!row) throw new Error('Record to update not found.');
      Object.assign(row, withoutUndefined(data), { updatedAt: new Date() });
      return this.hydrateReservation(row);
    },
    updateMany: async ({ where, data }: { where: Where; data: Row }) => {
      await tick();
      const targets = this.findReservations(where);
      for (const target of targets) {
        Object.assign(this.reservations.get(target.id as string)!, withoutUndefined(data), { updatedAt: new Date() });
      }
      return { count: targets.length };
    },
  };

  readonly notification = {
    createManyAndReturn: async ({ data }: { data: Row[] }) => {
      await tick();
      const created = data.map((item) => ({
        entityType: null,
        entityId: null,
        ...item,
        id: randomUUID(),
        readAt: null,
        createdAt: new Date(),
      }));
      this.notifications.push(...created);
      return created;
    },
  };

  private async acquireLock(key: string): Promise<() => void> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, previous.then(() => current));
    await previous;
    return release;
  }

  async $transaction<T>(work: ((tx: unknown) => Promise<T>) | Promise<unknown>[]): Promise<unknown> {
    if (Array.isArray(work)) return Promise.all(work);

    const heldLocks: Array<() => void> = [];
    const tx = {
      user: this.user,
      vehicle: this.vehicle,
      reservation: this.reservation,
      notification: this.notification,
      $executeRaw: async (_sql: TemplateStringsArray, ...values: unknown[]) => {
        if (this.options.honorAdvisoryLocks !== false) {
          heldLocks.push(await this.acquireLock(String(values[0])));
        }
        return 1;
      },
    };
    try {
      return await work(tx);
    } finally {
      heldLocks.forEach((release) => release());
    }
  }
}
