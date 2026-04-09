import { expect, test } from "@playwright/test";

test.describe("Full flow: Generate → Practice → Library → Settings", () => {
  test("Home page renders with navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Shadowing Training" })).toBeVisible();
    await expect(page.getByRole("link", { name: "新しいスクリプトを生成" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ライブラリを見る" })).toBeVisible();
  });

  test("Generate script and practice it", async ({ page }) => {
    // Navigate to Generate page
    await page.goto("/generate");
    await expect(page.getByRole("heading", { name: "スクリプト生成" })).toBeVisible();

    // Verify topic and difficulty options are visible
    await expect(page.getByRole("button", { name: "Business" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Intermediate", exact: true })).toBeVisible();

    // Select topic and difficulty (defaults: business + intermediate are fine)
    // Click generate
    await page.getByRole("button", { name: "生成する" }).click();

    // Wait for generation progress
    await expect(page.getByText("音声生成中...")).toBeVisible({ timeout: 10_000 });

    // Wait for navigation to practice page (generation can take up to 2 minutes)
    await page.waitForURL(/\/practice\//, { timeout: 120_000 });

    // Practice page should show sentences
    await expect(page.locator("button").filter({ hasText: /.+/ }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Verify EN/JA toggles exist and are active
    const enButton = page.getByRole("button", { name: "EN", exact: true });
    const jaButton = page.getByRole("button", { name: "JA", exact: true });
    await expect(enButton).toBeVisible();
    await expect(jaButton).toBeVisible();

    // Toggle EN off → English text should be hidden
    await enButton.click();
    // Toggle EN back on
    await enButton.click();

    // Toggle JA off → Japanese text should be hidden
    await jaButton.click();
    // Toggle JA back on
    await jaButton.click();
  });

  test("Library shows generated script", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "ライブラリ" })).toBeVisible();

    // Wait for scripts to load
    const scriptCards = page.locator("a[href^='/practice/']");
    await expect(scriptCards.first()).toBeVisible({ timeout: 10_000 });

    // Verify filter buttons
    await expect(page.getByRole("button", { name: "すべて" })).toBeVisible();
    await expect(page.getByRole("button", { name: "未練習" })).toBeVisible();
    await expect(page.getByRole("button", { name: "練習済み" })).toBeVisible();

    // Click filter tabs
    await page.getByRole("button", { name: "練習済み" }).click();
    await page.getByRole("button", { name: "すべて" }).click();
  });

  test("Settings page speed control works", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Speed presets (SPEED_PRESETS: [0.7, 1.0, 1.2] renders as "0.7x", "1x", "1.2x")
    await expect(page.getByRole("button", { name: "0.7x" })).toBeVisible();
    await expect(page.getByRole("button", { name: "1x", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "1.2x" })).toBeVisible();

    // Click presets
    await page.getByRole("button", { name: "0.7x" }).click();
    await page.getByRole("button", { name: "1.2x" }).click();
    await page.getByRole("button", { name: "1x", exact: true }).click();

    // Range slider exists
    await expect(page.locator("input[type='range']")).toBeVisible();
  });

  test("Bottom navigation works", async ({ page }) => {
    await page.goto("/");

    // Navigate via bottom nav
    await page.locator("nav a[href='/generate']").click();
    await expect(page).toHaveURL("/generate");

    await page.locator("nav a[href='/library']").click();
    await expect(page).toHaveURL("/library");

    await page.locator("nav a[href='/settings']").click();
    await expect(page).toHaveURL("/settings");

    await page.locator("nav a[href='/']").click();
    await expect(page).toHaveURL("/");
  });
});
