import { describe, expect, it } from "vitest";
import { resolveSystemNotificationHref } from "../src/modules/social/system-notification-targets";

describe("system notification targets", () => {
  it("normalizes system notification hrefs to routable web pages", () => {
    expect(
      resolveSystemNotificationHref({
        target: {
          type: "rating_target",
          id: "rating_target_1",
          title: "评分对象",
          status: "published",
          href: "/rankings/items/rating_target_1"
        }
      })
    ).toBe("/rating-targets/rating_target_1");

    expect(
      resolveSystemNotificationHref({
        target: {
          type: "aircraft_submission",
          id: "submission_1",
          title: "机型投稿",
          status: "rejected",
          href: "/aircraft-submissions/submission_1"
        }
      })
    ).toBe("/publish/aircraft?edit=submission_1");

    expect(
      resolveSystemNotificationHref({
        target: {
          type: "brand_application",
          id: "brand_application_1",
          title: "品牌申请",
          status: "approved",
          href: "/brand-applications/brand_application_1"
        }
      })
    ).toBe("/publish/brand?submitted=brand_application_1");
  });

  it("keeps already routable post and ranking hrefs", () => {
    expect(
      resolveSystemNotificationHref({
        target: {
          type: "post",
          id: "post_1",
          title: "文章",
          status: "published",
          href: "/posts/post_1"
        }
      })
    ).toBe("/posts/post_1");

    expect(
      resolveSystemNotificationHref({
        target: {
          type: "ranking",
          id: "ranking_1",
          title: "榜单",
          status: "published",
          href: "/rankings/ranking_1"
        }
      })
    ).toBe("/rankings/ranking_1");
  });
});
