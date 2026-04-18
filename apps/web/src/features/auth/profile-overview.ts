export function buildSelfProfileOverviewMetrics(input: {
  followerCount: number;
  followingCount: number;
  favoriteCount: number;
  postCount: number;
  rankingCount: number;
  aircraftCount: number;
  reviewCount: number;
}) {
  return [
    { key: "followers", label: "关注者", value: input.followerCount },
    { key: "following", label: "关注中", value: input.followingCount },
    { key: "favorites", label: "收藏", value: input.favoriteCount },
    {
      key: "published",
      label: "公开内容",
      value: input.postCount + input.rankingCount + input.aircraftCount + input.reviewCount
    }
  ] as const;
}

export function getProfileMessageSummary(unreadCount: number) {
  if (unreadCount > 0) {
    return {
      tone: "unread" as const,
      title: `${unreadCount} 条未读消息`,
      description: "优先处理评论、@提醒和系统通知。"
    };
  }

  return {
    tone: "default" as const,
    title: "消息中心",
    description: "当前没有未读消息，可以继续浏览主页内容。"
  };
}

export function getVisitorProfileRelationshipSummary(input: {
  canViewContent: boolean;
  canFollow: boolean;
  isFollowing: boolean;
}) {
  if (!input.canViewContent) {
    return {
      title: "内容暂不可见",
      description: "建立关注关系后，这里会自动刷新对你开放的资料和内容范围。"
    };
  }

  if (input.isFollowing) {
    return {
      title: "已建立关注关系",
      description: "你现在看到的是对方当前向关注者开放的内容。"
    };
  }

  if (input.canFollow) {
    return {
      title: "可查看公开内容",
      description: "继续关注这位飞友后，后续关系变化会更及时同步。"
    };
  }

  return {
    title: "资料与内容已开放",
    description: "你当前可以浏览对方公开展示的资料和内容。"
  };
}
