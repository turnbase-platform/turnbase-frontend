import type { TextInputStatus } from "@astryxdesign/core/TextInput";
import { ApiError } from "../../shared/api";

/** The per-field message the server attached (`error-handling.md` `errors[]`), if any. */
export function fieldStatus(error: unknown, field: string): TextInputStatus | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const match = error.problem.errors?.find((entry) => entry.field === field);
  return match ? { type: "error", message: match.message } : undefined;
}
