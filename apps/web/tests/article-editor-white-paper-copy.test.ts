import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publishArticlePageSource = readFileSync(
  new URL("../src/routes/publish-article-page.tsx", import.meta.url),
  "utf8"
);
const richTextEditorSource = readFileSync(
  new URL("../src/components/rich-text-editor.tsx", import.meta.url),
  "utf8"
);

describe("article editor white-paper copy regression", () => {
  it("does not keep the old article media cap constants or copy in the publish page", () => {
    expect(publishArticlePageSource).not.toContain("ARTICLE_IMAGE_LIMIT");
    expect(publishArticlePageSource).not.toContain("ARTICLE_VIDEO_LIMIT");
    expect(publishArticlePageSource).not.toContain("0/6");
    expect(publishArticlePageSource).not.toContain("0/2");
    expect(publishArticlePageSource).not.toContain("最多插入 6 张图片");
    expect(publishArticlePageSource).not.toContain("文章最多插入 2 个视频");
  });

  it("removes the old teaching copy from the publish page and rich text editor", () => {
    expect(publishArticlePageSource).not.toContain("写作工作区");
    expect(publishArticlePageSource).not.toContain("标题、栏目、摘要和正文现在是连续输入流");
    expect(publishArticlePageSource).not.toContain("这里会显示正文里插入过的本地图片和视频");
    expect(publishArticlePageSource).not.toContain("正文预览会显示在这里");
    expect(richTextEditorSource).not.toContain("从这里开始写正文，支持标题层级、列表、表格、图片和视频。");
    expect(richTextEditorSource).not.toContain("支持图片、视频、本地预览后统一上传。");
    expect(richTextEditorSource).not.toContain("工具栏以高频写作操作为主，表格和媒体插入已保留。");
  });
});
