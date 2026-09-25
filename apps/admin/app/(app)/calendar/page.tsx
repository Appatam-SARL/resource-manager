'use client';

import { PageHeader } from '@/components/shared/page-header';
import { CalendarView } from '@/features/calendar';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendrier"
        description="Visualisez les réservations PENDING et APPROVED sur la période."
      />
      <CalendarView />
    </div>
  );
}
