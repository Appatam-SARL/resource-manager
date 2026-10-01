'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Boxes, CalendarDays, Clock3, History, Inbox } from 'lucide-react';
import { Stagger, StaggerItem, FadeIn } from '@/components/motion';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ReservationMiniList } from '@/components/shared/reservation-mini-list';
import { StatCard } from '@/components/shared/stat-card';
import { buttonVariants } from '@/components/ui/button';
import {
  DashboardResources,
  DashboardToday,
  useDashboardReservations,
  useDashboardSummary,
  useDashboardTwoDays,
} from '@/features/dashboard';
import {
  formatDayDelta,
  formatLongDate,
  getGreeting,
  splitTodayAndYesterday,
} from '@/features/dashboard/lib/dashboard';
import { useReservations } from '@/features/reservations';
import { useNow } from '@/hooks/use-now';
import { dashboardSubtitle } from '@/lib/format';
import { canAccessRoute, organizationContext } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';

const PENDING_PREVIEW = 5;

export default function DashboardPage() {
  const { user } = useAuth();
  const now = useNow();

  const summaryQuery = useDashboardSummary();
  const twoDaysQuery = useDashboardTwoDays(now);
  const recentQuery = useDashboardReservations(6);
  const pendingQuery = useReservations({ page: 1, limit: PENDING_PREVIEW, status: 'PENDING' });

  const day = useMemo(
    () => (twoDaysQuery.data ? splitTodayAndYesterday(twoDaysQuery.data, now) : undefined),
    [twoDaysQuery.data, now],
  );

  if (!user) return null;

  const summary = summaryQuery.data;
  const org = organizationContext(user);
  const isEmployee = user.role === 'EMPLOYEE';
  const canOpenResources = canAccessRoute(user.role, '/vehicles');
  const totalResources = summary ? summary.resources.vehicles.total + summary.resources.rooms.total : 0;
  const availableResources = summary
    ? summary.resources.vehicles.available + summary.resources.rooms.available
    : 0;
  const pendingTotal = pendingQuery.data?.meta.total;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${getGreeting(now)}, ${user.firstName}`}
        description={`${formatLongDate(now)} · ${dashboardSubtitle(user.role)}`}
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{org.company}</span>
            {user.direction ? <span>· {org.direction}</span> : null}
          </span>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-3" delay={0.05}>
        <StaggerItem>
          <StatCard
            label="Réservations aujourd’hui"
            icon={CalendarDays}
            loading={!day && !twoDaysQuery.isError}
            value={day ? day.today.length : '—'}
            hint={day ? formatDayDelta(day.today.length, day.yesterdayCount) : 'Donnée indisponible'}
            href="/calendar"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={isEmployee ? 'Mes demandes en attente' : 'En attente de validation'}
            icon={Clock3}
            tone={summary && summary.reservations.pending > 0 ? 'attention' : 'default'}
            loading={summaryQuery.isLoading}
            value={summary ? summary.reservations.pending : '—'}
            hint={
              summary
                ? `${summary.reservations.approved} approuvée${summary.reservations.approved > 1 ? 's' : ''} · ${summary.reservations.total} au total`
                : 'Donnée indisponible'
            }
            href="/reservations"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Ressources disponibles"
            icon={Boxes}
            loading={summaryQuery.isLoading}
            value={
              summary ? (
                <>
                  {availableResources}
                  <span className="text-lg font-medium text-muted-foreground"> / {totalResources}</span>
                </>
              ) : (
                '—'
              )
            }
            hint={
              summary
                ? `${summary.resources.vehicles.available} véhicule${summary.resources.vehicles.available > 1 ? 's' : ''} · ${summary.resources.rooms.available} salle${summary.resources.rooms.available > 1 ? 's' : ''}`
                : 'Donnée indisponible'
            }
            href={canOpenResources ? '/vehicles' : undefined}
          />
        </StaggerItem>
      </Stagger>

      <FadeIn delay={0.12} className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel
            title={isEmployee ? 'Vos demandes en attente' : 'Réservations à traiter'}
            description={
              pendingTotal !== undefined && pendingTotal > PENDING_PREVIEW
                ? `${PENDING_PREVIEW} affichées sur ${pendingTotal}`
                : isEmployee
                  ? 'En attente de validation par un responsable'
                  : 'Demandes en attente de validation dans votre périmètre'
            }
            flush
            action={
              <Link href="/reservations" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}>
                Tout voir
              </Link>
            }
          >
            <ReservationMiniList
              reservations={pendingQuery.data?.data}
              isError={pendingQuery.isError}
              onRetry={() => void pendingQuery.refetch()}
              skeletonRows={3}
              empty={{
                icon: Inbox,
                title: 'Aucune demande en attente',
                description: isEmployee
                  ? 'Toutes vos demandes ont été traitées.'
                  : 'Toutes les demandes de votre périmètre ont été traitées.',
              }}
              trailing={
                isEmployee
                  ? undefined
                  : (reservation) => (
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
                      >
                        Examiner
                      </Link>
                    )
              }
            />
          </Panel>
        </div>
        <div className="lg:col-span-2">
          <DashboardToday
            events={day?.today}
            now={now}
            isError={twoDaysQuery.isError}
            onRetry={() => void twoDaysQuery.refetch()}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.18} className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="Activité récente" description="Dernières réservations de votre périmètre" flush>
            <ReservationMiniList
              reservations={recentQuery.data}
              isError={recentQuery.isError}
              onRetry={() => void recentQuery.refetch()}
              empty={{
                icon: History,
                title: 'Aucune activité récente',
                description: 'Les nouvelles réservations apparaîtront ici.',
              }}
            />
          </Panel>
        </div>
        <div className="lg:col-span-2">
          {summaryQuery.isError ? (
            <Panel title="Ressources">
              <p className="text-sm text-muted-foreground" role="alert">
                Impossible de charger l’état des ressources.{' '}
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => void summaryQuery.refetch()}>
                  Réessayer
                </button>
              </p>
            </Panel>
          ) : (
            <DashboardResources summary={summary} canOpenResources={canOpenResources} />
          )}
        </div>
      </FadeIn>
    </div>
  );
}
