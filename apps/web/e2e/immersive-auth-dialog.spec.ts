import { expect, test } from "playwright/test";
import {
  expectImmersiveShell,
  readFirstModelPath,
  readFirstPostPath,
  readFirstRatingTargetPath
} from "./support/auth";

test.describe("沉浸式详情页登录弹窗", () => {
  test("文章详情未登录评论时在当前标签页弹登录框", async ({ page }) => {
    await page.goto(await readFirstPostPath(page));
    await expectImmersiveShell(page);
    await page.getByRole("button", { name: "登录后评论" }).click();

    await expect(page.getByText("登录后才能评论")).toBeVisible();
    await expect(page.getByRole("button", { name: "去登录" })).toBeVisible();
  });

  test("机型详情未登录评论时在当前标签页弹登录框", async ({ page }) => {
    await page.goto(await readFirstModelPath(page));
    await expectImmersiveShell(page);
    await page.getByRole("button", { name: "登录后发表评论" }).click();

    await expect(page.getByText("登录后才能参与评论")).toBeVisible();
    await expect(page.getByRole("button", { name: "去登录" })).toBeVisible();
  });

  test("排行对象详情未登录互动时在当前标签页弹登录框", async ({ page }) => {
    await page.goto(await readFirstRatingTargetPath(page));
    await expectImmersiveShell(page);
    await page.getByRole("button", { name: "登录后参与互动" }).click();

    await expect(page.getByText("登录后才能参与互动")).toBeVisible();
    await expect(page.getByRole("button", { name: "去登录" })).toBeVisible();
  });
});
