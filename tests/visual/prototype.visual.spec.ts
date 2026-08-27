import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "compact", width: 667, height: 375 },
  { name: "reference", width: 844, height: 390 },
  { name: "large", width: 915, height: 412 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} landscape contains the complete stage`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");
    await page.waitForSelector(".v03-stage");

    const overflow = await page.evaluate(() => ({
      horizontal:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      vertical:
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    }));
    expect(overflow).toEqual({ horizontal: false, vertical: false });

    await expect(page.locator(".active-line .player-card")).toHaveCount(3);
    await expect(page.locator(".v03-bench .player-card")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /shoot/i })).toBeVisible();
    await expect(page.locator(".defender-token")).toHaveCount(3);
    await expect(page.locator(".goalie-token")).toBeVisible();

    const activeBoxes = await page
      .locator(".active-line .player-card")
      .evaluateAll((cards) =>
        cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
    expect(
      Math.max(...activeBoxes.map((box) => box.width)) -
        Math.min(...activeBoxes.map((box) => box.width)),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.max(...activeBoxes.map((box) => box.height)) -
        Math.min(...activeBoxes.map((box) => box.height)),
    ).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: `test-results/${viewport.width}x${viewport.height}-opening.png`,
      fullPage: false,
    });
  });
}

test("substitution and shoot are playable through tap controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  await page.getByRole("button", { name: /Jet Larsson/ }).click();
  await page.getByRole("button", { name: /Rook Bell.*Recover/ }).click();
  await page.getByRole("button", { name: /cycle/i }).click();
  await expect(page.locator(".goalie-token")).toHaveClass(/moving/);

  await page.getByRole("button", { name: /Ridge Mercer/ }).click();
  await page.getByRole("button", { name: /Jet Larsson.*Recover/ }).click();
  await expect(page.locator(".goalie-token")).toHaveClass(/screened/);

  await page.getByRole("button", { name: /shoot/i }).click();
  await expect(page.getByRole("dialog").getByText(/^GOAL$/)).toBeVisible();
});

test("an overextended attack becomes a counterattack that Hatch can stop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  await page.getByRole("button", { name: /Jet Larsson/ }).click();
  await page.getByRole("button", { name: /Rook Bell.*Recover/ }).click();
  await page.getByRole("button", { name: /cycle/i }).click();
  await page.getByRole("button", { name: /cycle/i }).click();
  await expect(page.locator(".defence-board--counterattack")).toBeVisible();

  await page.getByRole("button", { name: /Hatch Vale/ }).click();
  await page.getByRole("button", { name: /Flare Kovac.*Finish/ }).click();
  await page.getByRole("button", { name: /pressure puck/i }).click();
  await expect(
    page.getByText("INTERCEPTION").or(page.getByText("TAKEAWAY")),
  ).toBeVisible();
});
