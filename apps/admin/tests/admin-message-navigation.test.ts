import { describe, expect, it } from "vitest";
import {
  adminMessagesQueryKey,
  adminModerationTodosQueryKey,
  resolveAdminMessageDestination,
  sanitizeAdminMessageFilters
} from "../src/features/messages/admin-message-navigation";
import { ADMIN_ROUTE_PATHS } from "../src/lib/admin-routes";

describe("admin message navigation helpers", () => {
  it("maps rating target messages to the canonical rating target moderation route", () => {
    expect(
      resolveAdminMessageDestination("rating_targets", {
        href: "/admin/rankings",
        filters: {
          status: "pending",
          targetId: "target_1",
          rankingId: "ranking_1",
          entity: "rating_target"
        }
      })
    ).toEqual({
      pathname: ADMIN_ROUTE_PATHS.moderationRatingTargets,
      search: "?status=pending&targetId=target_1&rankingId=ranking_1&entity=rating_target"
    });
  });

  it("maps comment message domains to the unified comment moderation route via alias paths", () => {
    expect(
      resolveAdminMessageDestination("review_comments", {
        href: "/admin/review-comments",
        filters: {
          status: "pending",
          targetId: "comment_1"
        }
      })
    ).toEqual({
      pathname: "/admin/review-comments",
      search: "?status=pending&targetId=comment_1&domain=review"
    });
  });

  it("builds stable query keys for messages and todos", () => {
    expect(
      adminMessagesQueryKey({
        domain: "posts",
        type: "post_audit_result",
        readStatus: "unread",
        limit: 20
      })
    ).toEqual(["admin-messages", "posts", "post_audit_result", "unread", 20]);
    expect(adminModerationTodosQueryKey()).toEqual(["admin-messages", "todos"]);
  });

  it("drops incompatible type filters when the selected domain cannot emit them", () => {
    expect(
      sanitizeAdminMessageFilters({
        domain: "posts",
        type: "review_audit_result",
        readStatus: "unread"
      })
    ).toEqual({
      activeDomain: "posts",
      activeType: undefined,
      activeReadStatus: "unread",
      ignoredType: true
    });
  });
});
