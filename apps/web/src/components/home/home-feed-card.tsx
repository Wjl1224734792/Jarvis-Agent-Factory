import { memo } from "react";
import { ArticleFeedCard } from "./article-card";
import { CirclePostCard } from "./circle-post-card";
import { ModelCard } from "./model-card";
import { RankingCard } from "./ranking-card";

type HomeFeedItem = {
  kind?: "article" | "moment" | "circle_post" | "model" | "ranking";
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export const HomeFeedDispatcher = memo(function HomeFeedDispatcher({
  item,
  index,
}: {
  item: HomeFeedItem;
  index: number;
}) {
  const kind = item.kind;
  // 新格式有 { kind, data: {...} }，旧格式数据直接在顶层
  const innerData: Record<string, unknown> = kind && item.data ? item.data : item;

  switch (kind) {
    case "circle_post":
      return <CirclePostCard data={innerData as never} index={index} />;
    case "model":
      return <ModelCard data={innerData as never} />;
    case "ranking":
      return <RankingCard data={innerData as never} />;
    case "article":
    case "moment":
    default:
      return <ArticleFeedCard index={index} item={innerData as never} />;
  }
});
