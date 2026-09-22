/**
 * design-system.md §5 Enforcement (FR-TOK-008): no hex/rgb()/hsl()/oklch() color literal may
 * appear in a .css file. No allow-list — the one legitimate exemption (the token file itself)
 * no longer exists once Astryx supplies every token.
 */

const COLOR_FUNCTIONS = new Set(["rgb", "rgba", "hsl", "hsla", "oklch"]);
const HEX_COLOR = /^[0-9a-f]{3,8}$/i;

/**
 * @param {import("@eslint/css-tree").CssNodePlain} node
 * @param {(node: import("@eslint/css-tree").CssNodePlain) => void} report
 */
function walk(node, report) {
  if (!node || typeof node !== "object") return;
  if (node.type === "Hash" && HEX_COLOR.test(node.value)) {
    report(node);
  } else if (node.type === "Function" && COLOR_FUNCTIONS.has(node.name.toLowerCase())) {
    report(node);
    return; // the function's own arguments are not raw literals in their own right
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, report);
  }
}

/** @type {import("@eslint/css").CSSRuleDefinition<{ RuleOptions: [], MessageIds: "rawColor" }>} */
export default {
  meta: {
    type: "problem",
    languages: ["css/css"],
    docs: {
      description:
        "Disallow raw hex/rgb()/hsl()/oklch() color literals — use an Astryx --color-* token.",
    },
    schema: [],
    messages: {
      rawColor: "Raw color literal '{{text}}' — use an Astryx --color-* token instead.",
    },
  },
  create(context) {
    return {
      Declaration(node) {
        walk(node.value, (hit) => {
          context.report({
            loc: hit.loc,
            messageId: "rawColor",
            data: { text: context.sourceCode.getText(hit) },
          });
        });
      },
    };
  },
};
