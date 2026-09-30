import { Markdown } from "@astryxdesign/core/Markdown";

/**
 * The only hrefs and srcs the info document may render (`input-validation.md` § *The game info
 * document*). Checked on the URL Astryx's parser has already resolved from the Markdown AST, so
 * reference-style links and entity-encoded schemes arrive here as what they are.
 */
function allowedUrl(raw: string, protocols: readonly string[]): boolean {
  try {
    return protocols.includes(new URL(raw).protocol);
  } catch {
    return false; // relative or malformed — not one of the allowed absolute schemes
  }
}

const components = {
  // Any other scheme is dropped, not escaped: the text stays, the link does not.
  link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    allowedUrl(href, ["http:", "https:"]) ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  image: ({ src, alt }: { src: string; alt: string }) =>
    allowedUrl(src, ["https:"]) ? (
      <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
    ) : null,
};

/**
 * FR-GDET-003/004. Markdown → React elements on the platform origin, which holds the session
 * cookie: no HTML string is built anywhere in this path (IR-19), and raw HTML in the source is
 * parsed as text, never as markup. Bare URLs are not autolinked (`autolink` is left unset).
 */
export function InfoDocument({
  source,
  headingLevelStart = 3,
}: {
  source: string;
  headingLevelStart?: 1 | 2 | 3 | 4 | 5 | 6;
}) {
  return (
    <Markdown components={components} headingLevelStart={headingLevelStart}>
      {source}
    </Markdown>
  );
}
