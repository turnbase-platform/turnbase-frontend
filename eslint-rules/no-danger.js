/**
 * input-validation.md § *Output encoding* (IR-19): `dangerouslySetInnerHTML` is banned
 * platform-wide. The platform renders no HTML string anywhere — the game info document and the
 * game log are Markdown parsed straight to React elements — so the ban has no exception, and a
 * lint rule is what stops a later change quietly re-introducing one.
 *
 * Matches the name wherever it can appear: a JSX attribute, an object key in a
 * `createElement` props bag, a property access, or a string/template literal used as a key.
 */

const BANNED = "dangerouslySetInnerHTML";

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: { description: `Disallow ${BANNED} anywhere — Markdown renders to React elements.` },
    schema: [],
    messages: {
      banned: `${BANNED} is banned (input-validation.md § Output encoding): render to React elements, never to an HTML string.`,
    },
  },
  create(context) {
    const report = (node) => {
      context.report({ node, messageId: "banned" });
    };
    return {
      Identifier(node) {
        if (node.name === BANNED) report(node);
      },
      JSXIdentifier(node) {
        if (node.name === BANNED) report(node);
      },
      Literal(node) {
        if (node.value === BANNED) report(node);
      },
      TemplateElement(node) {
        if (node.value.cooked === BANNED) report(node);
      },
    };
  },
};
