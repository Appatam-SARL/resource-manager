'use client';

import Link from 'next/link';
import { List } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { buttonVariants } from '@/components/ui/button';
import { CalendarView } from '@/features/calendar';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendrier"
        description="Occupation des véhicules et des salles : réservations en attente, approuvées et terminées."
        actions={
          <Link href="/reservations" className={buttonVariants({ variant: 'outline' })}>
            <List className="size-4" aria-hidden />
            Liste des réservations
          </Link>
        }
      />
      <CalendarView />
    </div>
  );
}
