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
          contentCategoryId: "cat_1",
          sourceLabel: " Flight Daily ",
          sourceUrl: " https://example.com/source "
        },
        ["img_1"],
        ["vid_1"]
      )
    ).toEqual({
      title: "Official bulletin",
      content: "Ready for publish.",
      contentHtml: "<p>Ready for <strong>publish</strong>.</p>",
      contentCategoryId: "cat_1",
      sourceLabel: "Flight Daily",
      sourceUrl: "https://example.com/source",
      declaration: "",
      imageIds: ["img_1"],
      videoIds: ["vid_1"]
    });
  });

  it("passes declaration through unchanged when provided", () => {
    expect(
      buildOfficialArticlePayload(
        {
          title: "Reprinted article",
          content: "Content",
          contentCategoryId: "cat_1",
          declaration: "reprinted",
          sourceLabel: "Original Source",
          sourceUrl: "https://origin.example.com"
        },
        [],
        []
      )
    ).toMatchObject({
      declaration: "reprinted",
      sourceLabel: "Original Source",
      sourceUrl: "https://origin.example.com"
    });
  });

  it("returns empty declaration and null source when only title and content provided", () => {
    expect(
      buildOfficialArticlePayload(
        {
          title: "Simple post",
          content: "Body",
          contentCategoryId: "cat_1"
        },
        [],
        []
      )
    ).toMatchObject({
      declaration: "",
      sourceLabel: null,
      sourceUrl: null
    });
  });

  it("drops source url when source label is blank", () => {
    expect(
      buildOfficialArticlePayload(
        {
          title: "Official bulletin",
          content: "Ready for publish.",
          contentCategoryId: "cat_1",
          sourceLabel: " ",
          sourceUrl: "https://example.com/source"
        },
        [],
        []
      )
    ).toMatchObject({
      sourceLabel: null,
      sourceUrl: null
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

    expect(
      removeMediaFromHtml(
        '<p>Intro</p><figure data-video-block="true"><video controls><source src="https://cdn.example.com/a.mp4" type="video/mp4" /></video></figure><p>Body</p>',
        "https://cdn.example.com/a.mp4"
      )
    ).toBe("<p>Intro</p><p>Body</p>");
  });
});
