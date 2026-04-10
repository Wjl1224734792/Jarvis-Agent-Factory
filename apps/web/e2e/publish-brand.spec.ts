import { expect, test } from "playwright/test";
import { seededUserStorageStatePath } from "./support/auth";

test.use({ storageState: seededUserStorageStatePath });

test.describe("品牌申请页", () => {
  test("提交成功后停留当前页并展示待审核成功态", async ({ page }) => {
    await page.goto("/publish/brand");

    const uniqueSuffix = Date.now().toString().slice(-6);
    await page.getByPlaceholder("品牌名称").fill(`E2E 品牌 ${uniqueSuffix}`);
    await page.getByPlaceholder("请输入英文 slug").fill(`e2e-brand-${uniqueSuffix}`);
    await page.getByPlaceholder("可补充品牌定位、产品线或官网等，便于我们核对").fill(
      "用于验证品牌申请提交成功后保留当前页面并展示待审核状态。"
    );

    await page.getByRole("button", { name: "提交品牌申请" }).click();

    await expect(page).toHaveURL(/\/publish\/brand/);
    await expect(page.getByRole("heading", { name: "品牌申请已提交" })).toBeVisible();
    await expect(page.getByText("待审核", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("申请编号：")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回首页" })).toBeVisible();
    await expect(page.getByRole("link", { name: "返回飞行器投稿" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "品牌申请已提交" })).toBeVisible();
    await expect(page.getByText("申请编号：")).toBeVisible();
  });
});
