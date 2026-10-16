'use client';

import { useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addFixedEquipmentLabel,
  fixedEquipmentLabelSchema,
  MAX_FIXED_EQUIPMENT_ITEMS,
} from '@/features/rooms/schemas/room-schema';

type FixedEquipmentFieldProps = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean;
};

/** Free labels entered as chips (Enter or "Ajouter"); permanent equipment of the room, not bookable. */
export function FixedEquipmentField({ id, value, onChange, invalid = false }: FixedEquipmentFieldProps) {
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const full = value.length >= MAX_FIXED_EQUIPMENT_ITEMS;

  const commit = () => {
    if (!draft.trim()) return;
    const parsed = fixedEquipmentLabelSchema.safeParse(draft);
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? 'Libellé invalide');
      return;
    }
    onChange(addFixedEquipmentLabel(value, parsed.data));
    setDraft('');
    setDraftError(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Équipements fixes">
          {value.map((label) => (
            <li
              key={label}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-secondary pr-1 pl-2.5 text-[13px] font-medium text-foreground ring-1 ring-border"
            >
              {label}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== label))}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`Retirer ${label}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={full}
          placeholder={full ? `${MAX_FIXED_EQUIPMENT_ITEMS} équipements maximum` : 'Écran, tableau blanc, visioconférence…'}
          aria-invalid={invalid || Boolean(draftError)}
          onChange={(event) => {
            setDraft(event.target.value);
            if (draftError) setDraftError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
        <Button type="button" variant="outline" onClick={commit} disabled={full || !draft.trim()}>
          <Plus className="size-4" aria-hidden />
          Ajouter
        </Button>
      </div>
      {draftError ? <p className="text-xs text-destructive">{draftError}</p> : null}
    </div>
  );
}
