/**
 * design-system.md §5 Enforcement (FR-TOK-008): no px/rem length literal may appear on
 * padding/margin/gap/inset (or a logical/directional longhand of one) in a .css file. No
 * allow-list — every value comes from Astryx's --spacing-* scale.
 */

const RAW_UNITS = new Set(["px", "rem"]);

const SPACING_PROPERTY = /^(-[a-z]+-)?(padding|margin|inset|gap|row-gap|column-gap)(-[a-z-]+)?$/i;

/**
 * @param {import("@eslint/css-tree").CssNodePlain} node
 * @param {(node: import("@eslint/css-tree").CssNodePlain) => void} report
 */
function walk(node, report) {
  if (!node || typeof node !== "object") return;
  if (node.type === "Dimension" && RAW_UNITS.has(node.unit.toLowerCase())) {
    report(node);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, report);
  }
}

/** @type {import("@eslint/css").CSSRuleDefinition<{ RuleOptions: [], MessageIds: "rawSpacing" }>} */
export default {
  meta: {
    type: "problem",
    languages: ["css/css"],
    docs: {
      description:
        "Disallow raw px/rem spacing on padding/margin/gap/inset — use an Astryx --spacing-* token.",
    },
    schema: [],
    messages: {
      rawSpacing:
        "Raw spacing value '{{text}}' on '{{property}}' — use an Astryx --spacing-* token instead.",
    },
  },
  create(context) {
    return {
      Declaration(node) {
        if (!SPACING_PROPERTY.test(node.property)) return;
        walk(node.value, (hit) => {
          context.report({
            loc: hit.loc,
            messageId: "rawSpacing",
            data: { text: context.sourceCode.getText(hit), property: node.property },
          });
        });
      },
    };
  },
};
