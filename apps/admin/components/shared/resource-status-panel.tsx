'use client';

import { useState } from 'react';
import type { ResourceStatus } from '@resource-manager/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Panel } from '@/components/shared/panel';
import { getStatusConfig, STATUS_TONE_CLASSES } from '@/lib/status';
import { cn } from 'cn';

const STATUS_CHOICES: { value: ResourceStatus; description: string }[] = [
  { value: 'AVAILABLE', description: 'Peut recevoir de nouvelles réservations.' },
  { value: 'MAINTENANCE', description: 'Temporairement indisponible à la réservation.' },
  { value: 'OUT_OF_SERVICE', description: 'Retiré du service, non réservable.' },
];

type ResourceStatusPanelProps = {
  status: ResourceStatus;
  /** "ce véhicule", "cette salle"… */
  resourceLabel: string;
  canManage: boolean;
  pending?: boolean;
  onChange: (status: ResourceStatus) => void;
};

/**
 * Operational status of a vehicle / room. Making a resource unavailable asks for confirmation;
 * existing reservations are not modified by this change.
 */
export function ResourceStatusPanel({ status, resourceLabel, canManage, pending = false, onChange }: ResourceStatusPanelProps) {
  const [target, setTarget] = useState<ResourceStatus | null>(null);

  const select = (next: ResourceStatus) => {
    if (next === status || pending) return;
    if (next === 'AVAILABLE') onChange(next);
    else setTarget(next);
  };

  return (
    <Panel title="Disponibilité" description={canManage ? 'Le statut détermine si la ressource est réservable.' : undefined}>
      <div role="radiogroup" aria-label="Statut de la ressource" className="space-y-2">
        {STATUS_CHOICES.map((choice) => {
          const config = getStatusConfig(choice.value);
          const selected = choice.value === status;
          if (!canManage && !selected) return null;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!canManage || pending}
              onClick={() => select(choice.value)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg p-3 text-left ring-1 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default',
                selected ? 'bg-muted/60 ring-input' : 'ring-border hover:bg-muted/40',
                pending && 'opacity-70',
              )}
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', STATUS_TONE_CLASSES[config.tone].dot)} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{config.label}</span>
                <span className="block text-xs text-muted-foreground">{choice.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={target === 'OUT_OF_SERVICE' ? 'Mettre hors service' : 'Mettre en maintenance'}
        description={`${resourceLabel.charAt(0).toUpperCase()}${resourceLabel.slice(1)} ne pourra plus recevoir de nouvelle réservation. Les réservations existantes ne sont pas modifiées : vérifiez-les si nécessaire.`}
        confirmLabel="Confirmer"
        destructive={target === 'OUT_OF_SERVICE'}
        loading={pending}
        onConfirm={() => {
          if (target) onChange(target);
          setTarget(null);
        }}
      />
    </Panel>
  );
}
