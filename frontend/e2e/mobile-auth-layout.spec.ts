import { expect, test, type Page } from "@playwright/test";

async function measureHorizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
}

test.describe("Mobile authentication layout", () => {
  test("keeps login layout stable without horizontal overflow while typing", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorised" }),
      });
    });

    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    const initialDimensions = await measureHorizontalOverflow(page);
    expect(initialDimensions.scrollWidth).toBeLessThanOrEqual(initialDimensions.viewportWidth + 1);

    await page.getByLabel("Email address").fill("athlete@example.com");
    await page.getByLabel("Password").fill("secure-passphrase-123");

    const dimensionsAfterTyping = await measureHorizontalOverflow(page);
    expect(dimensionsAfterTyping.scrollWidth).toBeLessThanOrEqual(dimensionsAfterTyping.viewportWidth + 1);
  });
});
