/**
 * design-system.md §5 Enforcement (FR-TOK-008): no hex/rgb()/hsl()/oklch() color literal may
 * appear in a .tsx file (e.g. an inline `style` prop). No allow-list.
 */

const HEX_COLOR = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch)\s*\(/i;

function findRawColor(text) {
  const hex = HEX_COLOR.exec(text);
  if (hex) return hex[0];
  const fn = COLOR_FUNCTION.exec(text);
  return fn ? fn[0] : null;
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw hex/rgb()/hsl()/oklch() color literals in .tsx — use an Astryx --color-* token.",
    },
    schema: [],
    messages: {
      rawColor: "Raw color literal '{{text}}' — use an Astryx --color-* token instead.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        const hit = findRawColor(node.value);
        if (hit) {
          context.report({ node, messageId: "rawColor", data: { text: hit } });
        }
      },
      TemplateElement(node) {
        const hit = findRawColor(node.value.raw);
        if (hit) {
          context.report({ node, messageId: "rawColor", data: { text: hit } });
        }
      },
    };
  },
};
