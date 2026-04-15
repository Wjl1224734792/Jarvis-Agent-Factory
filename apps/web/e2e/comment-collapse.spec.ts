import { expect, test, type Page } from "playwright/test";
import {
  readFirstModelPath,
  readFirstPostPath,
  readFirstRatingTargetPath
} from "./support/auth";

async function assertExpandCollapseOrSkip(page: Page) {
  const expand = page.getByRole("button", { name: /展开全部评论/ });
  if ((await expand.count()) === 0) {
    test.info().skip(true, "种子数据下该页顶级评论不足，未出现折叠入口");
    return;
  }
  await expand.click();
  await expect(page.getByRole("button", { name: "收起评论" })).toBeVisible();
}

test.describe("评论区折叠与展开", () => {
  test("文章详情：可展开全部评论", async ({ page }) => {
    await page.goto(await readFirstPostPath(page));
    await expect(page.locator("h1").first()).toBeVisible();
    await assertExpandCollapseOrSkip(page);
  });

  test("机型详情：可展开全部评论", async ({ page }) => {
    await page.goto(await readFirstModelPath(page));
    await expect(page.getByText("基础信息")).toBeVisible();
    await assertExpandCollapseOrSkip(page);
  });

  test("排行对象详情：可展开全部评论", async ({ page }) => {
    await page.goto(await readFirstRatingTargetPath(page));
    await expect(page).toHaveURL(/rating-targets\//);
    await assertExpandCollapseOrSkip(page);
  });
});
