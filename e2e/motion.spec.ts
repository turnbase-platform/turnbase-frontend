import { expect, test } from "./fixtures";

// IMP-M12-11: with `prefers-reduced-motion` the starfield is static and no pointer effect runs.
// The landing page is public, so this spends no registration and no guest.

async function sweepPointer(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  for (let i = 1; i <= 6; i++) await page.mouse.move(100 * i, 80 * i, { steps: 4 });
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(300);
}

const rootProp = (page: import("@playwright/test").Page, name: string) =>
  page.evaluate((n) => document.documentElement.style.getPropertyValue(n), name);

/** Two readings of the sky, far enough apart for a moving one to differ. */
async function skyDiffers(page: import("@playwright/test").Page): Promise<boolean> {
  const read = () =>
    page.evaluate(() => document.querySelector<HTMLCanvasElement>("canvas")?.toDataURL() ?? "");
  const first = await read();
  await page.waitForTimeout(1200);
  return first !== (await read());
}

test.describe("the OS asks for reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no pointer effect runs and the sky holds still", async ({ page }) => {
    await sweepPointer(page);
    expect(await rootProp(page, "--px")).toBe("");
    expect(await rootProp(page, "--sy")).toBe("");
    expect(await skyDiffers(page)).toBe(false);
  });
});

test.describe("no OS preference", () => {
  test("the pointer moves the parallax and the sky drifts", async ({ page }) => {
    await sweepPointer(page);
    expect(await rootProp(page, "--px")).not.toBe("");
    expect(await skyDiffers(page)).toBe(true);
  });

  test("the Reduce-motion setting stops them as the OS preference does", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("turnbase.reduceMotion", "on");
    });
    await sweepPointer(page);
    await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
    expect(await rootProp(page, "--px")).toBe("");
    expect(await skyDiffers(page)).toBe(false);
  });

  test("switching Cursor effects off stops the pointer effects alone", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("turnbase.cursorEffects", "off");
    });
    await sweepPointer(page);
    await expect(page.locator("html")).toHaveAttribute("data-cursor-effects", "off");
    expect(await rootProp(page, "--px")).toBe("");
  });
});
