import { describe, expect, it } from "vitest";
import {
  buildOfficialArticleDocument,
  getAdminRichTextMediaInsertions,
  parseOfficialArticleDocument,
  removeAdminRichTextMediaReferenceFromHtml
} from "../src/components/admin-rich-text-editor-helpers";

describe("buildOfficialArticleDocument", () => {
  it("prepends a marked summary block and keeps body plain text for submit payloads", () => {
    expect(
      buildOfficialArticleDocument("Lead summary", "<p>Body</p><p><strong>More</strong></p>")
    ).toEqual({
      contentHtml:
        '<p data-official-article-summary="true"><strong>Lead summary</strong></p><p>Body</p><p><strong>More</strong></p>',
      plainText: "Lead summary\n\nBody More"
    });
  });
});

describe("parseOfficialArticleDocument", () => {
  it("restores the summary from a marked leading paragraph", () => {
    expect(
      parseOfficialArticleDocument(
        '<p data-official-article-summary="true"><strong>Lead summary</strong></p><p>Body</p><p>Tail</p>'
      )
    ).toEqual({
      summary: "Lead summary",
      contentHtml: "<p>Body</p><p>Tail</p>",
      plainText: "Body Tail"
    });
  });

  it("leaves unmarked content untouched", () => {
    expect(parseOfficialArticleDocument("<p>Body only</p>")).toEqual({
      summary: "",
      contentHtml: "<p>Body only</p>",
      plainText: "Body only"
    });
  });
});

describe("getAdminRichTextMediaInsertions", () => {
  it("matches the web editor image and video insertion payload shape", () => {
    expect(
      getAdminRichTextMediaInsertions("image", [
        { id: "img_1", url: "https://cdn.example.com/cover.jpg", fileName: "cover.jpg" }
      ])
    ).toEqual([{ type: "image", attrs: { src: "https://cdn.example.com/cover.jpg", alt: "cover.jpg" } }]);

    expect(
      getAdminRichTextMediaInsertions("video", [{ id: "vid_1", url: "https://cdn.example.com/clip.mp4" }])
    ).toEqual([{ type: "videoBlock", attrs: { src: "https://cdn.example.com/clip.mp4", poster: null } }]);
  });
});

describe("removeAdminRichTextMediaReferenceFromHtml", () => {
  it("removes image, bare video and figure video blocks by asset url", () => {
    const html = [
      "<p>Intro</p>",
      '<figure><img src="https://cdn.example.com/a.jpg" alt="a" /></figure>',
      '<video controls src="https://cdn.example.com/b.mp4"></video>',
      '<figure data-video-block="true"><video controls><source src="https://cdn.example.com/c.mp4" type="video/mp4" /></video></figure>',
      "<p>Tail</p>"
    ].join("");

    expect(removeAdminRichTextMediaReferenceFromHtml(html, "https://cdn.example.com/a.jpg")).toBe(
      '<p>Intro</p><video controls src="https://cdn.example.com/b.mp4"></video><figure data-video-block="true"><video controls><source src="https://cdn.example.com/c.mp4" type="video/mp4" /></video></figure><p>Tail</p>'
    );
    expect(removeAdminRichTextMediaReferenceFromHtml(html, "https://cdn.example.com/b.mp4")).toBe(
      '<p>Intro</p><figure><img src="https://cdn.example.com/a.jpg" alt="a" /></figure><figure data-video-block="true"><video controls><source src="https://cdn.example.com/c.mp4" type="video/mp4" /></video></figure><p>Tail</p>'
    );
    expect(removeAdminRichTextMediaReferenceFromHtml(html, "https://cdn.example.com/c.mp4")).toBe(
      '<p>Intro</p><figure><img src="https://cdn.example.com/a.jpg" alt="a" /></figure><video controls src="https://cdn.example.com/b.mp4"></video><p>Tail</p>'
    );
  });
});
