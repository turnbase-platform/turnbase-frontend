import { test as base } from "@playwright/test";
import { tripwire } from "./support";

export { expect } from "@playwright/test";

/**
 * `test` with IMP-M8-16's tripwire armed: any console error, uncaught page error or `5xx` seen by a
 * player's page fails the spec that saw it, even when every assertion passed.
 */
export const test = base.extend<{ tripwire: undefined }>({
  tripwire: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture names from the destructuring
    async ({}, use) => {
      tripwire.reset();
      await use(undefined);
      const seen = tripwire.seen();
      if (seen.length > 0)
        throw new Error(`tripwire: ${String(seen.length)} seen\n${seen.join("\n")}`);
    },
    { auto: true },
  ],
});
