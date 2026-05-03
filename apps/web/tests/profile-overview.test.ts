import { describe, expect, it } from "vitest";
import {
  buildSelfProfileOverviewMetrics,
  getProfileMessageSummary,
  getVisitorProfileRelationshipSummary
} from "../src/features/auth/profile-overview";

describe("profile-overview", () => {
  it("builds self profile metrics with a published content total", () => {
    expect(
      buildSelfProfileOverviewMetrics({
        followerCount: 12,
        followingCount: 7,
        favoriteCount: 4,
        postCount: 6,
        rankingCount: 2,
        aircraftCount: 1,
        reviewCount: 3
      })
    ).toEqual([
      { key: "followers", label: "关注者", value: 12 },
      { key: "following", label: "关注中", value: 7 },
      { key: "favorites", label: "收藏", value: 4 },
      { key: "published", label: "公开内容", value: 12 }
    ]);
  });

  it("returns different message center summaries for unread and clean states", () => {
    expect(getProfileMessageSummary(0)).toEqual({
      tone: "default",
      title: "消息中心",
      description: "当前没有未读消息，可以继续浏览主页内容。"
    });
    expect(getProfileMessageSummary(5)).toEqual({
      tone: "unread",
      title: "5 条未读消息",
      description: "优先处理评论、@提醒和系统通知。"
    });
  });

  it("describes visitor relationship state based on current visibility", () => {
    expect(
      getVisitorProfileRelationshipSummary({
        canViewContent: false,
        canFollow: true,
        isFollowing: false
      })
    ).toEqual({
      title: "内容暂不可见",
      description: "建立关注关系后，这里会自动刷新对你开放的资料和内容范围。"
    });

    expect(
      getVisitorProfileRelationshipSummary({
        canViewContent: true,
        canFollow: true,
        isFollowing: true
      })
    ).toEqual({
      title: "已建立关注关系",
      description: "你现在看到的是对方当前向关注者开放的内容。"
    });
  });
});
