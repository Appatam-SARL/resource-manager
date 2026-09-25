'use client';

import Link from 'next/link';
import {
  Car,
  CheckCircle2,
  Clock3,
  DoorOpen,
  CalendarDays,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDashboardReservations,
  useDashboardResources,
  useDashboardSummary,
} from '@/features/dashboard';
import {
  dashboardSubtitle,
  formatDateTime,
  reservationResourceLabel,
  userDisplayName,
} from '@/lib/format';
import { organizationContext, ROLE_LABELS } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';
import { FadeIn, ScaleOnHover, Stagger, StaggerItem } from '@/components/motion';

export default function DashboardPage() {
  const { user } = useAuth();
  const summaryQuery = useDashboardSummary();
  const reservationsQuery = useDashboardReservations(8);
  const resourcesQuery = useDashboardResources();

  if (!user) return null;

  const org = organizationContext(user);
  const summary = summaryQuery.data;

  const isLoading =
    summaryQuery.isLoading ||
    reservationsQuery.isLoading ||
    resourcesQuery.isLoading;

  const isError =
    summaryQuery.isError ||
    reservationsQuery.isError ||
    resourcesQuery.isError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Chargement…" />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Impossible de charger le dashboard"
        message="Vérifiez votre connexion à l’API puis réessayez."
        onRetry={() => {
          void summaryQuery.refetch();
          void reservationsQuery.refetch();
          void resourcesQuery.refetch();
        }}
      />
    );
  }

  const stats = [
    {
      id: 'reservations-total',
      label: 'Réservations',
      value: summary.reservations.total,
      hint: 'Total dans le périmètre',
      icon: CalendarDays,
      primary: true,
    },
    {
      id: 'reservations-pending',
      label: 'En attente',
      value: summary.reservations.pending,
      hint: 'À traiter',
      icon: Clock3,
    },
    {
      id: 'reservations-approved',
      label: 'Approuvées',
      value: summary.reservations.approved,
      hint: 'Validées',
      icon: CheckCircle2,
    },
    {
      id: 'vehicles',
      label: 'Véhicules',
      value: summary.resources.vehicles.available,
      hint: `${summary.resources.vehicles.total} au total`,
      icon: Car,
    },
    {
      id: 'rooms',
      label: 'Salles',
      value: summary.resources.rooms.available,
      hint: `${summary.resources.rooms.total} au total`,
      icon: DoorOpen,
    },
  ];

  const recent = reservationsQuery.data ?? [];
  const resourceItems = [
    ...(resourcesQuery.data?.vehicles ?? []).slice(0, 4).map((vehicle) => ({
      id: vehicle.id,
      name: `${vehicle.registrationNumber} — ${vehicle.brand} ${vehicle.model}`,
      status: vehicle.status,
      href: `/vehicles/${vehicle.id}`,
      kind: 'Véhicule',
    })),
    ...(resourcesQuery.data?.rooms ?? []).slice(0, 4).map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      href: `/rooms/${room.id}`,
      kind: 'Salle',
    })),
  ].slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${dashboardSubtitle(user.role)} · ${ROLE_LABELS[user.role]}`}
      />

      <FadeIn delay={0.05}>
      <Card className="rounded-3xl">
        <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Contexte organisationnel
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              Entreprise : {org.company}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Direction : {org.direction}
          </p>
        </CardContent>
      </Card>
      </FadeIn>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" delay={0.1}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <StaggerItem key={stat.id}>
              <ScaleOnHover>
            <Card
              className={cn(
                'rounded-3xl',
                stat.primary &&
                  'bg-[#1b4332] text-white ring-0 [--card-spacing:--spacing(5)]',
              )}
            >
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      stat.primary ? 'text-white/80' : 'text-muted-foreground',
                    )}
                  >
                    {stat.label}
                  </p>
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-2xl',
                      stat.primary
                        ? 'bg-white/15 text-white'
                        : 'bg-secondary text-primary',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <p
                  className={cn(
                    'text-3xl font-semibold tracking-tight',
                    stat.primary ? 'text-white' : 'text-foreground',
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    stat.primary ? 'text-white/70' : 'text-muted-foreground',
                  )}
                >
                  {stat.hint}
                </p>
              </CardContent>
            </Card>
              </ScaleOnHover>
            </StaggerItem>
          );
        })}
      </Stagger>

      <FadeIn delay={0.2} className="grid gap-4 lg:grid-cols-5">
        <Card className="rounded-3xl lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Réservations récentes</CardTitle>
            <Link
              href="/reservations"
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir tout
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune réservation récente.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {recent.map((reservation) => (
                  <li key={reservation.id}>
                    <Link
                      href={`/reservations/${reservation.id}`}
                      className="flex flex-col gap-2 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {reservationResourceLabel(reservation)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {userDisplayName(reservation.user)} ·{' '}
                          {formatDateTime(reservation.startAt)}
                        </p>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Disponibilité des ressources</CardTitle>
          </CardHeader>
          <CardContent>
            {resourceItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune ressource dans le périmètre.
              </p>
            ) : (
              <ul className="space-y-3">
                {resourceItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2.5 transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.kind}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
