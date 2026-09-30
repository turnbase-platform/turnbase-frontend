import { Badge } from "@astryxdesign/core/Badge";
import type { Badge as GameBadge } from "./catalog-types";

/** FR-CAT-010 / FR-GDET-002: Official and Verified are visibly distinct; Unverified shows none. */
export function BadgeLabel({ badge }: { badge: GameBadge }) {
  if (badge === "OFFICIAL") return <Badge label="Official" variant="info" />;
  if (badge === "VERIFIED") return <Badge label="Verified" variant="success" />;
  return null;
}
