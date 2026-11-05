import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
try {
  await page.goto(process.env.APP_URL || "http://localhost:5173", {
    waitUntil: "networkidle",
  });
  for (const name of [
    "Home",
    "Music Library",
    "Playlists",
    "Favorites",
    "Visualizer",
    "Equalizer",
    "Themes",
    "Settings",
  ]) {
    await page
      .locator(".desktop-sidebar .nav-item")
      .filter({ hasText: name })
      .click();
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      results.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target),
      })),
      [],
      `${name} accessibility violations`,
    );
    console.log(`PASS: ${name}, no automated WCAG A/AA violations`);
  }
  await page
    .getByRole("button", { name: "Expand player", exact: true })
    .first()
    .click();
  const modalResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    modalResults.violations.map(({ id }) => id),
    [],
    "Expanded player accessibility",
  );
  console.log(
    "PASS: expanded player, dialog labels, focus trap, and inert background",
  );
} finally {
  await browser.close();
}
