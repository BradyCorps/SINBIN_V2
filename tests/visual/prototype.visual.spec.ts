import { expect, test } from "@playwright/test";

const VIEWPORTS = [
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
    await page.waitForSelector(".prototype-stage");

    const overflow = await page.evaluate(() => ({
      horizontal:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      vertical:
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    }));
    expect(overflow).toEqual({ horizontal: false, vertical: false });

    await expect(page.locator(".active-player")).toHaveCount(3);
    await expect(page.locator(".bench-player")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /shoot/i })).toBeVisible();
    await expect(page.getByText("KNOWN GOALIE")).toBeVisible();

    const activeBoxes = await page
      .locator(".active-player")
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

  await page.getByRole("button", { name: /Rook Bell/ }).click();
  await page.getByRole("button", { name: /^Recover:/ }).click();
  await expect(page.getByText("Controlled", { exact: true })).toHaveClass(
    /current/,
  );

  await page.getByRole("button", { name: /Jet Larsson/ }).click();
  await page.getByRole("button", { name: /^Recover:/ }).click();
  await expect(page.getByText("Shot ready", { exact: true })).toHaveClass(
    /current/,
  );

  await page.getByRole("button", { name: /shoot/i }).click();
  await expect(page.getByText(/SHOT BANKED/)).toBeVisible();
});
