import { expect, test } from "playwright/test";
import { loginAsSeededAdmin } from "./support/auth";

const adminBaseUrl = process.env.E2E_ADMIN_BASE_URL ?? "http://localhost:17381";

test.describe("搜索与后台快捷入口", () => {
  test("Web 顶部搜索会进入结果页并支持继续跳转", async ({ page }) => {
    await page.goto("/home");
    await page.locator("header input").fill("DJI");
    await page.locator("header input").press("Enter");

    await expect(page).toHaveURL(/\/search\?q=DJI/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("搜索");

    const firstResultLink = page
      .locator(
        'a[href^="/posts/"], a[href^="/models/"], a[href^="/rankings/"], a[href^="/rating-targets/"], a[href^="/users/"]'
      )
      .first();
    await expect(firstResultLink).toBeVisible();
    await firstResultLink.click();

    await expect(page).not.toHaveURL(/\/search\?q=DJI/);
  });

  test("Admin 顶部搜索会进入后台结果页，并能继续验证待处理快捷入口", async ({ page }) => {
    await loginAsSeededAdmin(page);
    await page.goto(`${adminBaseUrl}/admin/overview`);

    await page.locator(".admin-shell__search input").fill("DJI");
    await page.locator(".admin-shell__search input").press("Enter");

    await expect(page).toHaveURL(/\/admin\/search\?q=DJI/);
    await expect(page.getByText("审核对象")).toBeVisible();

    const firstAdminResult = page.locator(".ant-list-item a").first();
    await expect(firstAdminResult).toBeVisible();
    await firstAdminResult.click();

    await expect(page).not.toHaveURL(/\/admin\/search\?q=DJI/);
    await page.goto(`${adminBaseUrl}/admin/overview`);

    await page.getByRole("link", { name: /待审核文章/ }).click();
    await expect(page).toHaveURL(/\/admin\/moderation\/articles\?status=pending/);
  });
});
