import type { TransformFnParams } from 'class-transformer';

export const MAX_FIXED_EQUIPMENT_ITEMS = 20;
export const MAX_FIXED_EQUIPMENT_LABEL_LENGTH = 60;
/** Commas are reserved as the separator of the `fixedEquipment` list filter. */
export const FIXED_EQUIPMENT_LABEL_PATTERN = /^[^,]+$/;

/** Trims labels, drops empty ones and removes case-insensitive duplicates (first spelling wins). */
export function normalizeFixedEquipment(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of labels) {
    const label = raw.trim().replace(/\s+/g, ' ');
    const key = label.toLocaleLowerCase('fr');
    if (!label || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

export function transformFixedEquipmentBody({ value }: TransformFnParams): unknown {
  if (!Array.isArray(value)) return value;
  if (!value.every((item): item is string => typeof item === 'string')) return value;
  return normalizeFixedEquipment(value);
}

/** Accepts `?fixedEquipment=a,b` as well as repeated `?fixedEquipment=a&fixedEquipment=b`. */
export function transformFixedEquipmentQuery({ value }: TransformFnParams): unknown {
  const parts = (Array.isArray(value) ? value : [value]).flatMap((item: unknown) =>
    typeof item === 'string' ? item.split(',') : [],
  );
  const labels = normalizeFixedEquipment(parts);
  return labels.length > 0 ? labels : undefined;
}
