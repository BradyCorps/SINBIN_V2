import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "compact", width: 667, height: 375 },
  { name: "reference", width: 844, height: 390 },
  { name: "large", width: 915, height: 412 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} landscape contains the complete roster lab`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");
    await page.waitForSelector(".v06-stage");

    const overflow = await page.evaluate(() => ({
      horizontal:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      vertical:
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    }));
    expect(overflow).toEqual({ horizontal: false, vertical: false });
    await expect(page.locator(".roster-card")).toHaveCount(9);
    await expect(page.locator(".roster-card--selected")).toHaveCount(6);
    await expect(page.locator(".scout-panel li")).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: /start three shifts/i }),
    ).toBeEnabled();

    await page.screenshot({
      path: `test-results/${viewport.width}x${viewport.height}-v06-scouting.png`,
      fullPage: false,
    });

    await page.getByRole("button", { name: /start three shifts/i }).click();
    await page.waitForSelector(".v03-stage");
    const matchOverflow = await page.evaluate(() => ({
      horizontal:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      vertical:
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    }));
    expect(matchOverflow).toEqual({ horizontal: false, vertical: false });
    await expect(page.getByText(/SHIFT 1\/3/)).toBeVisible();
    await page.screenshot({
      path: `test-results/${viewport.width}x${viewport.height}-v06-match.png`,
      fullPage: false,
    });
  });
}

test("scouting changes the known three-shift formation sequence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByLabel("Scout report").selectOption("crease-guard");
  await expect(page.locator(".scout-panel li").nth(0)).toContainText(
    "Slot Collapse",
  );
  await expect(page.locator(".scout-panel li").nth(1)).toContainText(
    "Wide Denial",
  );
  await expect(page.locator(".scout-panel li").nth(2)).toContainText(
    "Slot Collapse",
  );
});

test("a specialist can be replaced by a hybrid in the same lineup slot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: /Flare Kovac/ }).click();
  await expect(
    page.getByLabel("Selected lineup").getByText("OPEN"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Spark Ibarra/ }).click();
  await expect(
    page.getByLabel("Selected lineup").getByText("Spark", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".roster-card--selected")).toHaveCount(6);
});

test("the lineup budget blocks six specialists and slots can move directly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  await page.getByRole("button", { name: /Relay Okafor/ }).click();
  await page.getByRole("button", { name: /Lane Sato/ }).click();
  await expect(page.getByText("6/6 · 11/10 PTS")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /over budget/i }),
  ).toBeDisabled();

  const lineup = page.getByLabel("Selected lineup");
  await expect(lineup.locator("li").nth(1)).toContainText("Lane");
  await expect(lineup.locator("li").nth(2)).toContainText("Flare");
  await page.getByRole("button", { name: "Move Finish up" }).click();
  await expect(lineup.locator("li").nth(1)).toContainText("Flare");
  await expect(lineup.locator("li").nth(2)).toContainText("Lane");
});

test("the selected six enter a locked known formation and can score", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: /start three shifts/i }).click();
  await expect(page.getByText(/SHIFT 1\/3/)).toBeVisible();
  await expect(
    page.getByText("Wide Denial", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /Jet Larsson/ }).click();
  await page.getByRole("button", { name: /Rook Bell.*Recover/ }).click();
  await page.getByRole("button", { name: /shoot/i }).click();
  await expect(page.getByRole("dialog").getByText(/^GOAL$/)).toBeVisible();
  await page.getByRole("button", { name: /record shift/i }).click();
  await expect(page.getByText(/SHIFT 2\/3/)).toBeVisible();
  await expect(page.getByText(/GF 1–0 GA/)).toBeVisible();
});

test("the constructed defensive line remains playable after a turnover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: /Flare Kovac/ }).click();
  await page.getByRole("button", { name: /Hatch Vale/ }).click();
  await page.getByRole("button", { name: /Hatch Vale/ }).click();
  await page.getByRole("button", { name: /Flare Kovac/ }).click();
  await page.getByRole("button", { name: /start three shifts/i }).click();
  await page.getByRole("button", { name: /cycle/i }).click();
  await page.getByRole("button", { name: /cycle/i }).click();
  await page.getByRole("button", { name: /^pressure$/i }).click();
  await expect(page.getByText(/TAKEAWAY/)).toBeVisible();
});

test("three resolved shifts produce a goals-for and goals-against match result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: /start three shifts/i }).click();

  for (let shift = 1; shift <= 3; shift += 1) {
    await page.getByRole("button", { name: /shoot/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /record shift/i }).click();
  }

  await expect(page.getByLabel("Three-shift match result")).toBeVisible();
  await expect(page.getByText("DRAW", { exact: true })).toBeVisible();
  await expect(page.getByText(/0 GOALS FOR · 0 GOALS AGAINST/)).toBeVisible();
});
