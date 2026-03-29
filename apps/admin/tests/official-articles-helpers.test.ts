import { describe, expect, it } from "vitest";
import {
  buildOfficialArticlePayload,
  removeMediaFromHtml
} from "../src/features/posts/official-articles-helpers";

describe("buildOfficialArticlePayload", () => {
  it("trims article fields and preserves uploaded image ids", () => {
    expect(
      buildOfficialArticlePayload(
        {
          title: " Official bulletin ",
          content: " Ready for publish. ",
          contentHtml: " <p>Ready for <strong>publish</strong>.</p> ",
          contentCategoryId: "cat_1"
        },
        ["img_1"],
        ["vid_1"]
      )
    ).toEqual({
      title: "Official bulletin",
      content: "Ready for publish.",
      contentHtml: "<p>Ready for <strong>publish</strong>.</p>",
      contentCategoryId: "cat_1",
      imageIds: ["img_1"],
      videoIds: ["vid_1"]
    });
  });

  it("removes matching media nodes from the article html", () => {
    expect(
      removeMediaFromHtml(
        '<p>Intro</p><figure><img src="https://cdn.example.com/a.jpg" alt="a" /></figure><p>Body</p>',
        "https://cdn.example.com/a.jpg"
      )
    ).toBe("<p>Intro</p><p>Body</p>");

    expect(
      removeMediaFromHtml(
        '<p>Intro</p><figure><video src="https://cdn.example.com/a.mp4"></video></figure><p>Body</p>',
        "https://cdn.example.com/a.mp4"
      )
    ).toBe("<p>Intro</p><p>Body</p>");
  });
});
