import { Link } from "react-router-dom";
import { HeartIcon, MessageCircleIcon } from "lucide-react";
import { APP_ROUTES } from "@feijia/shared";
import { getEditorialImage } from "@/lib/aviation-media";
import { formatCount } from "./helpers";

interface CirclePostCardData {
  id: string;
  title: string;
  contentPreview: string;
  circle: { id: string; slug: string; name: string } | null;
  coverImageUrl: string | null;
  likeCount: number;
  commentCount: number;
  author: { id: string; displayName: string; avatarUrl: string | null; role: string };
  createdAt: string;
}

export function CirclePostCard({ data, index }: { data: CirclePostCardData; index: number }) {
  return (
    <article className="bg-white px-3 py-2.5 transition duration-200 hover:bg-emerald-50/55">
      <Link
        className="grid grid-cols-[minmax(0,1fr)_120px] items-start gap-3"
        to={APP_ROUTES.postDetail.replace(":id", data.id)}
      >
        <div className="flex min-h-[80px] min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            {data.circle ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[0.68rem] text-emerald-700">
                飞友圈·{data.circle.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[0.68rem] text-emerald-700">
                飞友圈
              </span>
            )}
          </div>
          <h2 className="mt-1 line-clamp-2 text-[0.95rem] font-semibold leading-[1.25] text-foreground">
            {data.title}
          </h2>
          <p className="mt-0.5 line-clamp-2 max-w-[34rem] text-[0.78rem] leading-[1.3rem] text-foreground/68">
            {data.contentPreview}
          </p>
          <div className="mt-auto flex items-center gap-3.5 pt-2 text-[0.72rem] text-foreground/62">
            <span className="inline-flex items-center gap-1">
              <HeartIcon className="size-3" />
              {formatCount(data.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircleIcon className="size-3" />
              {formatCount(data.commentCount)}
            </span>
          </div>
        </div>
        <div className="shrink-0 overflow-hidden rounded bg-slate-100">
          <img
            alt={data.title}
            className="h-[80px] w-full object-cover"
            src={data.coverImageUrl ?? getEditorialImage(data.id, index)}
          />
        </div>
      </Link>
    </article>
  );
}
