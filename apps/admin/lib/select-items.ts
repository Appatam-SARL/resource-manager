/**
 * Value → label map for the Base UI `Select` `items` prop, so the trigger shows the
 * selected label instead of the raw value (ids, sentinel values such as "ALL").
 */
export function selectItems(
  entities: ReadonlyArray<{ id: string; name: string }>,
  extra: Record<string, string> = {},
): Record<string, string> {
  const items: Record<string, string> = { ...extra };
  for (const entity of entities) {
    items[entity.id] = entity.name;
  }
  return items;
}
