/** A calendar date in the viewer's locale, from an ISO-8601 instant. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
