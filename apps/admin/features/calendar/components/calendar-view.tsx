'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import { formatISO } from 'date-fns';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import { FilterChips, type FilterChipOption } from '@/components/shared/data-toolbar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectItems } from '@/lib/select-items';
import { useCalendar } from '@/features/calendar/hooks/use-calendar';
import { useCompaniesOptions } from '@/hooks/use-companies-options';
import { getStatusConfig, STATUS_TONE_CLASSES } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

const VIEW_OPTIONS: FilterChipOption<CalendarViewType>[] = [
  { value: 'dayGridMonth', label: 'Mois' },
  { value: 'timeGridWeek', label: 'Semaine' },
  { value: 'timeGridDay', label: 'Jour' },
];

const TYPE_OPTIONS: FilterChipOption<ResourceType | 'ALL'>[] = [
  { value: 'ALL', label: 'Tout' },
  { value: 'VEHICLE', label: 'Véhicules' },
  { value: 'ROOM', label: 'Salles' },
];

/** Statuses returned by GET /calendar (cancelled / rejected reservations no longer block a slot). */
const LEGEND_STATUSES: ReservationStatus[] = ['PENDING', 'APPROVED', 'COMPLETED'];

function toDateParam(date: Date): string {
  return formatISO(date, { representation: 'date' });
}

function initialCalendarView(): CalendarViewType {
  if (typeof window === 'undefined') return 'dayGridMonth';
  return window.matchMedia('(max-width: 767px)').matches ? 'timeGridDay' : 'dayGridMonth';
}

type EventMeta = { resourceName?: string; requesterName?: string };

function renderEventContent(arg: EventContentArg) {
  const meta = arg.event.extendedProps as EventMeta;
  const label = meta.resourceName ?? arg.event.title;
  return (
    <div className="flex min-w-0 flex-col overflow-hidden leading-tight">
      <span className="truncate text-[12px] font-medium">
        {arg.timeText ? <span className="mr-1 text-muted-foreground tabular-nums">{arg.timeText}</span> : null}
        {label}
      </span>
      {meta.requesterName && arg.view.type !== 'dayGridMonth' ? (
        <span className="truncate text-[11px] text-muted-foreground">{meta.requesterName}</span>
      ) : null}
    </div>
  );
}

export function CalendarView() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const { user } = useAuth();
  const isGroupAdmin = user?.role === 'GROUP_ADMIN';
  const companiesQuery = useCompaniesOptions(isGroupAdmin);

  const [companyId, setCompanyId] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType | ''>('');
  const [initialView] = useState(initialCalendarView);
  const [view, setView] = useState<CalendarViewType>(initialView);
  const [title, setTitle] = useState('');
  const [range, setRange] = useState({ startDate: '', endDate: '' });

  const query = useCalendar({ ...range, companyId, resourceType });

  const events = useMemo<EventInput[]>(
    () =>
      (query.data ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        classNames: [`rm-event--${event.status.toLowerCase()}`],
        extendedProps: { resourceName: event.resourceName, requesterName: event.requesterName },
      })),
    [query.data],
  );

  const handleDatesSet = (arg: DatesSetArg) => {
    const startDate = toDateParam(arg.start);
    const endDate = toDateParam(arg.end);
    setTitle(arg.view.title);
    setView(arg.view.type as CalendarViewType);
    setRange((prev) =>
      prev.startDate === startDate && prev.endDate === endDate ? prev : { startDate, endDate },
    );
  };

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    router.push(`/reservations/${info.event.id}`);
  };

  const api = () => calendarRef.current?.getApi();
  const isEmpty = query.isSuccess && events.length === 0;

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-3 md:p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Période précédente" onClick={() => api()?.prev()}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Période suivante" onClick={() => api()?.next()}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => api()?.today()}>
            Aujourd’hui
          </Button>
          <h2 className="ml-1 truncate text-base font-semibold text-foreground first-letter:uppercase" aria-live="polite">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            label="Type de ressource"
            options={TYPE_OPTIONS}
            value={resourceType || 'ALL'}
            onChange={(next) => setResourceType(next === 'ALL' ? '' : next)}
          />
          {isGroupAdmin ? (
            <Select
              value={companyId || 'ALL'}
              onValueChange={(next) => setCompanyId(!next || next === 'ALL' ? '' : next)}
              items={selectItems(companiesQuery.data ?? [], { ALL: 'Toutes les entreprises' })}
            >
              <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Entreprise">
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
          ) : null}
          <FilterChips
            label="Vue du calendrier"
            options={VIEW_OPTIONS}
            value={view}
            onChange={(next) => api()?.changeView(next)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-xs text-muted-foreground">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Légende">
          {LEGEND_STATUSES.map((status) => {
            const config = getStatusConfig(status);
            return (
              <li key={status} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', STATUS_TONE_CLASSES[config.tone].dot)} aria-hidden />
                {config.label}
              </li>
            );
          })}
        </ul>
        <span aria-live="polite">
          {query.isFetching
            ? 'Actualisation…'
            : isEmpty
              ? 'Aucune réservation sur cette période'
              : query.isSuccess
                ? `${events.length} réservation${events.length > 1 ? 's' : ''} sur la période`
                : null}
        </span>
      </div>

      {query.isError ? (
        <div role="alert" className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-lg bg-destructive/[0.05] px-3 py-2 text-sm ring-1 ring-destructive/15">
          <span className="text-foreground">Impossible de charger les réservations de cette période.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RotateCw className="size-3.5" aria-hidden />
            Réessayer
          </Button>
        </div>
      ) : null}

      <div className={cn('rm-calendar relative transition-opacity', query.isFetching && 'opacity-70')}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={initialView}
          headerToolbar={false}
          locale={frLocale}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          nowIndicator
          scrollTime="07:00:00"
          allDaySlot={false}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          events={events}
          eventContent={renderEventContent}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
        />
      </div>
    </div>
  );
}
