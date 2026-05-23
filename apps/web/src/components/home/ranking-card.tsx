import { Link } from "react-router-dom";
import { APP_ROUTES } from "@feijia/shared";
import { TrophyIcon } from "lucide-react";

interface RankingCardData {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  itemCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export function RankingCard({ data }: { data: RankingCardData }) {
  return (
    <article className="bg-white px-3 py-2.5 transition duration-200 hover:bg-amber-50/55">
      <Link
        className="flex items-start gap-3"
        to={APP_ROUTES.rankingDetail.replace(":id", data.id)}
      >
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-100">
          {data.coverImageUrl ? (
            <img
              alt={data.title}
              className="h-full w-full object-cover"
              src={data.coverImageUrl}
            />
          ) : (
            <TrophyIcon className="size-5 text-amber-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[0.95rem] font-semibold text-foreground">
            {data.title}
          </h2>
          {data.description ? (
            <p className="mt-0.5 line-clamp-1 text-[0.76rem] text-foreground/62">
              {data.description}
            </p>
          ) : null}
          <div className="mt-1 flex items-center gap-3 text-[0.7rem] text-foreground/55">
            <span>共收录 {data.itemCount} 款</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
