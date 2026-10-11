import { Navigate } from "react-router";
import { Spinner } from "@astryxdesign/core/Spinner";
import { OAuthCompletionView } from "./OAuthCompletionView";
import { useOAuthCompletion } from "./useOAuthCompletion";

export function OAuthCompletionPage() {
  const form = useOAuthCompletion();
  // "Direct access without pending registration → /login".
  if (form.pending.state === "missing") return <Navigate to="/login" replace />;
  if (form.pending.state === "loading") return <Spinner label="Loading" />;
  return <OAuthCompletionView form={form} />;
}
