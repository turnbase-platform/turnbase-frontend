import { Avatar } from "@astryxdesign/core/Avatar";
import type { ComponentProps } from "react";

/**
 * A person as an avatar. The platform knows no presence, so there is no status dot — that is a
 * recorded deviation from the prototype (ADR-0017 §5), not an omission.
 */
export function Person({
  name,
  size = "md",
}: {
  name: string;
  size?: ComponentProps<typeof Avatar>["size"];
}) {
  return <Avatar name={name} size={size} />;
}
