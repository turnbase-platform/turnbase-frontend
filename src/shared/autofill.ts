/**
 * The HTML `autocomplete` token for a text field. Astryx's `TextInput` forwards unknown props to
 * its `<input>` but does not declare `autoComplete` in its types, so it is spread in rather than
 * written as an attribute — the spread is what keeps the type-checker out of the way.
 */
export function autofill(token: "username" | "current-password" | "new-password") {
  return { autoComplete: token };
}
