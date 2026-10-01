'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from 'cn';
import { FadeIn } from '@/components/motion';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Short contextual line under the description, e.g. "12 entreprises". */
  meta?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

export function PageHeader({
  title,
  description,
  meta,
  actions,
  back,
  className,
}: PageHeaderProps) {
  return (
    <FadeIn y={6} className={cn('space-y-3', className)}>
      {back ? (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="type-page-title font-heading">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          {meta ? (
            <div className="type-meta flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">{meta}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pb-0.5">{actions}</div>
        ) : null}
      </div>
    </FadeIn>
  );
}
