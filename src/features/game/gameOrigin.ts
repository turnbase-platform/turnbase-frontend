/**
 * The origin the server chose for this game's frontend — `new URL(gameFrontendUrl).origin`,
 * computed once (`shell-architecture.md` §5, ADR-0007 decision 3). The client never assembles the
 * URL and never falls back to a build-time constant: an unusable URL yields `null`, and the caller
 * renders nothing rather than framing something it cannot pin an origin to.
 */
export function trustedGameOrigin(gameFrontendUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(gameFrontendUrl);
  } catch {
    return null; // relative or malformed — `gameFrontendUrl` is contractually absolute
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.origin;
}
