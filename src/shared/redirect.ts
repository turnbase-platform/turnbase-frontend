// VW-REDIR-005/006, NFR-SEC-001, shell-architecture.md §3: the `redirect` parameter is an
// attacker-controlled value that comes back as a navigation target, so it is validated as an
// internal path before use and fails closed to the default landing.
export const DEFAULT_LANDING = "/rooms";

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns `raw` as a same-origin path (`pathname + search + hash`), or `DEFAULT_LANDING` if it
 * is absent or is anything else.
 *
 * "Starts with `/`" alone is the bug: `//evil.com` is a protocol-relative URL and `/\evil.com`
 * is read as one by browsers, so the candidate is also resolved against the platform origin and
 * accepted only if it stays there.
 */
export function safeRedirect(raw: string | null | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return DEFAULT_LANDING;
  }
  if (hasControlCharacter(raw)) return DEFAULT_LANDING;
  try {
    const { origin } = window.location;
    const resolved = new URL(raw, origin);
    if (resolved.origin !== origin) return DEFAULT_LANDING;
    const path = resolved.pathname + resolved.search + resolved.hash;
    return path.startsWith("//") ? DEFAULT_LANDING : path;
  } catch {
    return DEFAULT_LANDING;
  }
}
