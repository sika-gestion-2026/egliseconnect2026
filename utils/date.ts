/**
 * Returns today's date in YYYY-MM-DD format, reliably resolving the timezone.
 * We default to 'Europe/Paris' or 'Africa/Kinshasa' as standard francophone UTC+1/UTC+2,
 * or ideally use the system's local timezone correctly instead of forced UTC from the server.
 */
export function getTodayLocalDateString(): string {
  // `Intl.DateTimeFormat` with the local timezone is safer than `new Date().toISOString()`
  // which always forces UTC.
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    // We can allow the server default, or force a specific timezone like 'Europe/Paris' if needed.
    // For now, we use the local timezone of the environment, but format it cleanly.
  });
  
  const parts = formatter.formatToParts(new Date());
  let day = '', month = '', year = '';
  
  for (const part of parts) {
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
  }
  
  return `${year}-${month}-${day}`; // Always returns YYYY-MM-DD
}
