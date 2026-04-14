import { expect, test } from "playwright/test";
import {
  expectImmersiveShell,
  expectPublishShellTopNav,
  readAnotherUserProfilePath,
  readFirstModelPath,
  readFirstPostPath,
  readFirstRankingPath,
  readFirstRatingTargetPath,
  seededUserStorageStatePath
} from "./support/auth";

test.describe("站点浏览与创作冒烟", () => {
  test("公开浏览主链路可打开，并且沉浸式详情页不显示站点壳", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText("热门榜单")).toBeVisible();

    await page.goto(await readFirstPostPath(page));
    await expectImmersiveShell(page);
    await expect(page.locator("h1").first()).toBeVisible();

    await page.goto("/models");
    await expect(page.getByText("机型列表")).toBeVisible();
    await page.goto(await readFirstModelPath(page));
    await expectImmersiveShell(page);
    await expect(page.getByText("基础信息")).toBeVisible();

    await page.goto("/rankings");
    await expect(page.getByText("热门")).toBeVisible();
    await page.goto(await readFirstRankingPath(page));
    await expectImmersiveShell(page);
    await expect(page.getByText("完整排行")).toBeVisible();

    await page.goto(await readFirstRatingTargetPath(page));
    await expectImmersiveShell(page);
    await expect(page.getByRole("button", { name: "登录后参与互动" })).toBeVisible();

    await page.goto("/circle");
    await expect(page.getByRole("button", { name: "推荐" })).toBeVisible();
    await page.locator(".site-tab-panel button").first().click();
    await expect(page).toHaveURL(/note=/);
  });

});

test.describe("登录后核心创作冒烟", () => {
  test.use({ storageState: seededUserStorageStatePath });

  test("登录后核心创作页都能打开", async ({ page }) => {
    await page.goto("/publish/article");
    await expectPublishShellTopNav(page);
    await expect(page.getByRole("heading", { name: "发布文章" })).toBeVisible();
    await expect(page.getByRole("button", { name: "提交文章" })).toBeVisible();

    await page.goto("/publish/moment");
    await expectPublishShellTopNav(page);
    await expect(page.getByRole("heading", { name: "发布动态" })).toBeVisible();
    await expect(page.getByRole("button", { name: "提交动态" })).toBeVisible();

    await page.goto("/publish/aircraft");
    await expectPublishShellTopNav(page);
    await expect(page.getByRole("heading", { name: "发布飞行器" })).toBeVisible();
    await expect(page.getByRole("button", { name: "提交审核" })).toBeVisible();

    await page.goto("/publish/brand");
    await expectPublishShellTopNav(page);
    await expect(page.getByRole("heading", { name: "申请品牌" })).toBeVisible();
    await expect(page.getByRole("button", { name: "提交品牌申请" })).toBeVisible();

    await page.goto("/rankings/create");
    await expectPublishShellTopNav(page);
    await expect(page.getByRole("heading", { name: "创建榜单" })).toBeVisible();
    await expect(page.getByRole("button", { name: "发布榜单" })).toBeVisible();
  });

  test("authenticated user keeps self profile entry visible on another profile page", async ({ page }) => {
    await page.goto(await readAnotherUserProfilePath(page));

    await expect(page.locator("header input")).toBeVisible();
    await expect(page.locator('header a[href="/me"]').first()).toBeVisible();
  });
});
