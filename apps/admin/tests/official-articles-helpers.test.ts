import { describe, expect, it } from "vitest";
import { buildOfficialArticlePayload } from "../src/features/posts/official-articles-helpers";

describe("buildOfficialArticlePayload", () => {
  it("trims article fields and preserves uploaded image ids", () => {
    expect(
      buildOfficialArticlePayload(
        {
          title: " Official bulletin ",
          content: " Ready for publish. ",
          contentCategoryId: "cat_1"
        },
        ["img_1"]
      )
    ).toEqual({
      title: "Official bulletin",
      content: "Ready for publish.",
      contentCategoryId: "cat_1",
      imageIds: ["img_1"]
    });
  });
});
