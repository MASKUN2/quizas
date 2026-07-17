export function formatDate(iso: string | null): string {
  if (!iso) return '';
  // ISO date (YYYY-MM-DD). 'en-CA' yields ISO-8601 formatting.
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}
