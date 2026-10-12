import type { BadgeProps } from "@astryxdesign/core/Badge";

/**
 * The tint of an outcome badge. The label is the game's own free text and is always shown, so the
 * colour only reinforces the words a game commonly uses; anything else stays neutral.
 */
export function outcomeVariant(label: string): BadgeProps["variant"] {
  if (/^(victory|win|won)\b/i.test(label)) return "success";
  if (/^(defeat|loss|lost)\b/i.test(label)) return "error";
  return "neutral";
}
