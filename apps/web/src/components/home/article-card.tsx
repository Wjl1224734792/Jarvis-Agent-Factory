import { memo } from "react";
import { Link } from "react-router-dom";
import { EyeIcon, HeartIcon, MessageCircleIcon } from "lucide-react";
import { APP_ROUTES } from "@feijia/shared";
import { Badge } from "@/components/ui/badge";
import { getEditorialImage } from "@/lib/aviation-media";
import { DETAIL_PAGE_LINK_PROPS } from "@/lib/web-routes";
import { formatCount } from "./helpers";

type HomeFeedItem = {
  id: string;
  title: string;
  contentPreview: string;
  commentCount: number;
  viewCount: number;
  images: { url: string }[];
  source?: { label: string; url?: string | null } | null;
  author: { role: string };
  engagement: { likeCount: number };
};

export const ArticleFeedCard = memo(function ArticleFeedCard({
  item,
  index,
}: {
  item: HomeFeedItem;
  index: number;
}) {
  return (
    <article className="bg-white px-3 py-2.5 transition duration-200 hover:bg-sky-50/55">
      <Link
        className="grid grid-cols-[minmax(0,1fr)_148px] items-start gap-3"
        {...DETAIL_PAGE_LINK_PROPS}
        to={APP_ROUTES.postDetail.replace(":id", item.id)}
      >
        <div className="flex min-h-[96px] min-w-0 flex-col">
          <div className="flex items-start gap-2">
            <h2 className="line-clamp-2 max-w-[30rem] text-[1rem] leading-[1.25] font-semibold text-foreground">
              {item.title}
            </h2>
            {item.author.role === "admin" ? <Badge variant="secondary">官方</Badge> : null}
          </div>

          {item.source ? (
            <div className="mt-1 text-[0.72rem] text-muted-foreground">
              来源：
              {item.source.url ? (
                <span
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(item.source?.url ?? "", "_blank", "noopener,noreferrer");
                  }}
                  role="link"
                  tabIndex={0}
                >
                  {item.source.label}
                </span>
              ) : (
                <span className="text-foreground/78">{item.source.label}</span>
              )}
            </div>
          ) : null}

          <p className="mt-1 line-clamp-2 max-w-[34rem] text-[0.82rem] leading-[1.35rem] text-foreground/72">
            {item.contentPreview}
          </p>

          <div className="mt-auto flex items-center gap-3.5 pt-2.5 text-[0.76rem] text-foreground/68">
            <span className="inline-flex items-center gap-1.5">
              <HeartIcon className="size-3.5" />
              {formatCount(item.engagement.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircleIcon className="size-3.5" />
              {formatCount(item.commentCount)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <EyeIcon className="size-3.5" />
              {formatCount(item.viewCount)}
            </span>
          </div>
        </div>

        <div className="shrink-0 overflow-hidden bg-slate-100">
          <img
            alt={item.title}
            className="h-[96px] w-full object-cover"
            src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
          />
        </div>
      </Link>
    </article>
  );
});
