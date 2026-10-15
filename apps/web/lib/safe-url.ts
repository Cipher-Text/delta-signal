/** Returns the URL only when it is an absolute http(s) address; anything else (javascript:, data:, junk) becomes null. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "https://www.bedsbd.org/about" → "bedsbd.org" */
export function domainOf(value: string | null | undefined): string | null {
  const safe = safeHttpUrl(value);
  return safe ? new URL(safe).hostname.replace(/^www\./, '') : null;
}
