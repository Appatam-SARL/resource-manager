'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import { formatISO } from 'date-fns';
import type { ResourceType } from '@resource-manager/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { useCalendar } from '@/features/calendar/hooks/use-calendar';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { RESOURCE_TYPE_LABELS } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

function toDateParam(date: Date): string {
  return formatISO(date, { representation: 'date' });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d97706',
  APPROVED: '#2d6a4f',
  REJECTED: '#dc2626',
  CANCELLED: '#6b7280',
  COMPLETED: '#40916c',
};

export function CalendarView() {
  const router = useRouter();
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);

  const [companyId, setCompanyId] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType | ''>('');
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: toDateParam(start),
      endDate: toDateParam(end),
    };
  });

  const query = useCalendar({
    startDate: range.startDate,
    endDate: range.endDate,
    companyId,
    resourceType,
  });

  const events = useMemo(
    () =>
      (query.data ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: STATUS_COLORS[event.status] ?? '#1b4332',
        borderColor: STATUS_COLORS[event.status] ?? '#1b4332',
      })),
    [query.data],
  );

  const handleDatesSet = (arg: DatesSetArg) => {
    const startDate = toDateParam(arg.start);
    const endDate = toDateParam(arg.end);
    setRange((prev) =>
      prev.startDate === startDate && prev.endDate === endDate
        ? prev
        : { startDate, endDate },
    );
  };

  const handleEventClick = (info: EventClickArg) => {
    router.push(`/reservations/${info.event.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-border/60 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Type de ressource</Label>
          <Select
            value={resourceType || 'ALL'}
            onValueChange={(value) =>
              setResourceType(
                !value || value === 'ALL' ? '' : (value as ResourceType),
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {RESOURCE_TYPE_LABELS[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        {isGroupAdmin ? (
          <div className="space-y-1.5">
            <Label>Entreprise</Label>
            <Select
              value={companyId || 'ALL'}
              onValueChange={(value) =>
                setCompanyId(!value || value === 'ALL' ? '' : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Toutes les entreprises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les entreprises</SelectItem>
                {(companiesQuery.data ?? []).map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-card p-4 ring-1 ring-border/60">
          {query.isFetching ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 z-10">
              <LoadingState rows={1} label="Actualisation du calendrier…" />
            </div>
          ) : null}
          <style>{`
            .fc {
              --fc-border-color: #e5e7eb;
              --fc-button-bg-color: #1b4332;
              --fc-button-border-color: #1b4332;
              --fc-button-hover-bg-color: #16362a;
              --fc-button-hover-border-color: #16362a;
              --fc-button-active-bg-color: #11291f;
              --fc-button-active-border-color: #11291f;
              --fc-today-bg-color: #e8f0ec;
              font-family: inherit;
            }
            .fc .fc-toolbar-title {
              font-size: 1.125rem;
              font-weight: 600;
            }
            .fc .fc-button {
              border-radius: 0.75rem;
              text-transform: capitalize;
              box-shadow: none !important;
            }
            .fc .fc-daygrid-event,
            .fc .fc-timegrid-event {
              border-radius: 0.5rem;
              padding: 1px 4px;
            }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            locale={frLocale}
            height="auto"
            events={events}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
          />
        </div>
      )}
    </div>
  );
}
