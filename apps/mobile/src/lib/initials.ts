/** "Jean Dupont" → "JD", "Marie" → "M", falls back to the email's first letter. */
export function getInitials(name?: string | null, fallback?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return (fallback?.trim().charAt(0) || '?').toUpperCase();
  }
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}
