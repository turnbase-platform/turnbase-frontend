import { Avatar } from "@astryxdesign/core/Avatar";
import type { ComponentProps } from "react";

/**
 * A person as an avatar. The platform knows no presence, so there is no status dot — that is a
 * recorded deviation from the prototype (ADR-0017 §5), not an omission. The avatar's own name
 * tooltip is off: the name is always printed beside it or is the label of the control around it,
 * and a tooltip that opens on the focus a closing menu hands back to its button throws.
 */
export function Person({
  name,
  size = "md",
}: {
  name: string;
  size?: ComponentProps<typeof Avatar>["size"];
}) {
  return <Avatar name={name} size={size} tooltip={false} />;
}
