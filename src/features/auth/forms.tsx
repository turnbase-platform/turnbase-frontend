import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { ApiError, rateLimitMessage } from "../../shared/api";
import { safeRedirect } from "../../shared/redirect";
import { IGoogle } from "../../ui";

/** Errors with no field of their own — everything the form cannot point at an input for. */
export function FormError({
  error,
  unauthorizedMessage,
}: {
  error: unknown;
  unauthorizedMessage?: string;
}) {
  if (!error) return null;
  let title = "Something went wrong. Please try again.";
  if (error instanceof ApiError) {
    if (error.status === 401 && unauthorizedMessage) title = unauthorizedMessage;
    else if (error.status === 429) title = rateLimitMessage(error);
    else if (error.problem.errors?.length) return null;
    else if (error.status < 500 && error.problem.detail) title = error.problem.detail;
  }
  return <Banner status="error" title={title} />;
}

/**
 * A full navigation, deliberately not a router link: `/auth/google` is answered by the monolith
 * (a 302 to Google), so `as="a"` opts this one button out of `<LinkProvider>`.
 */
export function GoogleButton({ redirect }: { redirect: string | null }) {
  const target = redirect ? `?redirect=${encodeURIComponent(safeRedirect(redirect))}` : "";
  return (
    <Button
      as="a"
      href={`/auth/google${target}`}
      label="Continue with Google"
      icon={<IGoogle />}
      variant="secondary"
      width="100%"
    />
  );
}
