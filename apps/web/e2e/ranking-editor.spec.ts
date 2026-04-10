import { expect, test } from "playwright/test";
import { seededUserStorageStatePath } from "./support/auth";

test.use({ storageState: seededUserStorageStatePath });

test.describe("榜单编辑页", () => {
  test("一句话摘要禁用原生拖拽改高，并且机型添加仍可用", async ({ page }) => {
    await page.goto("/rankings/create");

    await expect(page.getByRole("heading", { name: "创建榜单" })).toBeVisible();

    await page
      .getByPlaceholder("搜索机型、品牌或分类")
      .locator("xpath=following::button[.//img][1]")
      .click();
    await expect(page.getByText("#1", { exact: true })).toBeVisible();

    const summaryField = page.getByPlaceholder("一句话摘要").first();
    await expect(summaryField).toBeVisible();
    await expect(summaryField).toHaveValue("");

    const resize = await summaryField.evaluate((node) => window.getComputedStyle(node).resize);
    expect(resize).toBe("none");
  });
});
