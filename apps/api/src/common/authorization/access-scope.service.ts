import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type.js';

@Injectable()
export class AccessScopeService {
  isGroupAdmin(user: AuthenticatedUser): boolean {
    return user.role === Role.GROUP_ADMIN;
  }

  canManageCompany(user: AuthenticatedUser, companyId: string): boolean {
    if (user.role === Role.GROUP_ADMIN) return true;
    if (user.role === Role.COMPANY_ADMIN) {
      return user.companyId === companyId;
    }
    return false;
  }

  canAccessCompany(user: AuthenticatedUser, companyId: string): boolean {
    if (user.role === Role.GROUP_ADMIN) return true;
    return user.companyId === companyId;
  }

  assertCanAccessCompany(user: AuthenticatedUser, companyId: string): void {
    if (!this.canAccessCompany(user, companyId)) {
      throw new ForbiddenException('Accès refusé à cette entreprise.');
    }
  }

  assertCanManageCompany(user: AuthenticatedUser, companyId: string): void {
    if (!this.canManageCompany(user, companyId)) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à administrer cette entreprise.',
      );
    }
  }

  /**
   * Resolves which companyId to filter on for list endpoints.
   * GROUP_ADMIN may pass any companyId or omit for all.
   * Others are forced to their own company.
   */
  resolveCompanyFilter(
    user: AuthenticatedUser,
    requestedCompanyId?: string,
  ): string | undefined {
    if (user.role === Role.GROUP_ADMIN) {
      return requestedCompanyId;
    }
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('Accès refusé à cette entreprise.');
    }
    return user.companyId;
  }

  companyWhere(
    user: AuthenticatedUser,
    requestedCompanyId?: string,
  ): Prisma.CompanyWhereInput {
    const companyId = this.resolveCompanyFilter(user, requestedCompanyId);
    return companyId ? { id: companyId } : {};
  }

  /**
   * Direction-aware scope for managers.
   * MANAGER with direction → company + direction
   * MANAGER without direction → company only
   */
  directionScopeWhere(user: AuthenticatedUser): Prisma.ReservationWhereInput {
    if (user.role === Role.GROUP_ADMIN) return {};
    if (user.role === Role.COMPANY_ADMIN) {
      return { companyId: user.companyId };
    }
    if (user.role === Role.MANAGER) {
      if (user.directionId) {
        return {
          companyId: user.companyId,
          OR: [
            { directionId: user.directionId },
            { directionId: null, user: { directionId: user.directionId } },
            { userId: user.id },
          ],
        };
      }
      return { companyId: user.companyId };
    }
    // EMPLOYEE
    return { userId: user.id };
  }

  reservationListWhere(
    user: AuthenticatedUser,
    filters: {
      companyId?: string;
      directionId?: string;
      userId?: string;
    } = {},
  ): Prisma.ReservationWhereInput {
    const base = this.directionScopeWhere(user);
    const extra: Prisma.ReservationWhereInput = {};

    if (user.role === Role.GROUP_ADMIN && filters.companyId) {
      extra.companyId = filters.companyId;
    }
    if (
      (user.role === Role.GROUP_ADMIN || user.role === Role.COMPANY_ADMIN) &&
      filters.directionId
    ) {
      extra.directionId = filters.directionId;
    }
    if (filters.userId) {
      if (user.role === Role.EMPLOYEE && filters.userId !== user.id) {
        throw new ForbiddenException('Accès refusé.');
      }
      extra.userId = filters.userId;
    }

    return { AND: [base, extra] };
  }

  canViewReservation(
    user: AuthenticatedUser,
    reservation: {
      companyId: string;
      directionId: string | null;
      userId: string;
    },
  ): boolean {
    if (user.role === Role.GROUP_ADMIN) return true;
    if (user.role === Role.COMPANY_ADMIN) {
      return user.companyId === reservation.companyId;
    }
    if (user.role === Role.MANAGER) {
      if (user.companyId !== reservation.companyId) return false;
      if (!user.directionId) return true;
      return (
        reservation.directionId === user.directionId ||
        reservation.userId === user.id
      );
    }
    return reservation.userId === user.id;
  }

  canApproveReservation(
    user: AuthenticatedUser,
    reservation: {
      companyId: string;
      directionId: string | null;
      userId: string;
    },
  ): boolean {
    if (user.role === Role.GROUP_ADMIN) return true;
    if (user.role === Role.COMPANY_ADMIN) {
      return user.companyId === reservation.companyId;
    }
    if (user.role === Role.MANAGER) {
      if (user.companyId !== reservation.companyId) return false;
      if (!user.directionId) return true;
      return (
        reservation.directionId === user.directionId ||
        reservation.userId === user.id
      );
    }
    return false;
  }

  canModifyOwnReservation(
    user: AuthenticatedUser,
    reservationUserId: string,
  ): boolean {
    if (user.role === Role.GROUP_ADMIN || user.role === Role.COMPANY_ADMIN) {
      return true;
    }
    return user.id === reservationUserId;
  }
}
