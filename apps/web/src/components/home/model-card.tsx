import { Link } from "react-router-dom";
import { HeartIcon, MessageCircleIcon, EyeIcon } from "lucide-react";
import { APP_ROUTES } from "@feijia/shared";
import { formatCount } from "./helpers";

interface ModelCardData {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  priceMin: number | null;
  priceMax: number | null;
  powerType: string;
  favoriteCount: number;
  commentCount: number;
  viewCount: number;
  category: { id: string; slug: string; name: string } | null;
  brand: { id: string; slug: string; name: string; logoUrl: string | null } | null;
  coverImageUrl: string | null;
  maxFlightTimeMinutes: number | null;
  maxSpeedKph: number | null;
  createdAt: string;
}

function formatPrice(min: number | null, max: number | null) {
  if (min === null && max === null) return "价格待定";
  if (min === null) return `≤ ¥${(max as number).toLocaleString()}`;
  if (max === null) return `≥ ¥${min.toLocaleString()}`;
  if (min === max) return `¥${min.toLocaleString()}`;
  return `¥${min.toLocaleString()}-${max.toLocaleString()}`;
}

const powerTypeLabels: Record<string, string> = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动",
  other: "其他",
};

export function ModelCard({ data }: { data: ModelCardData }) {
  return (
    <article className="bg-white px-3 py-2.5 transition duration-200 hover:bg-sky-50/55">
      <Link
        className="flex items-start gap-3"
        to={APP_ROUTES.modelDetail.replace(":slug", data.slug)}
      >
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {data.brand?.logoUrl ? (
            <img
              alt={data.brand.name}
              className="size-8 object-contain"
              src={data.brand.logoUrl}
            />
          ) : (
            <span className="text-[0.65rem] font-semibold text-slate-400">
              {data.brand?.name?.charAt(0) ?? "M"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[0.95rem] font-semibold text-foreground">
              {data.brand?.name ? `${data.brand.name} ${data.name}` : data.name}
            </h2>
            <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[0.6rem] text-slate-500">
              {powerTypeLabels[data.powerType] ?? data.powerType}
            </span>
          </div>
          {data.summary ? (
            <p className="mt-0.5 line-clamp-1 text-[0.76rem] text-foreground/62">{data.summary}</p>
          ) : null}
          <div className="mt-1 flex items-center gap-3 text-[0.7rem] text-foreground/55">
            <span>{formatPrice(data.priceMin, data.priceMax)}</span>
            {data.maxFlightTimeMinutes ? (
              <span>续航 {data.maxFlightTimeMinutes}min</span>
            ) : null}
            {data.maxSpeedKph ? (
              <span>极速 {data.maxSpeedKph}km/h</span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[0.72rem] text-foreground/58">
            <span className="inline-flex items-center gap-1">
              <HeartIcon className="size-3" />
              {formatCount(data.favoriteCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircleIcon className="size-3" />
              {formatCount(data.commentCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="size-3" />
              {formatCount(data.viewCount)}
            </span>
          </div>
        </div>
        {data.coverImageUrl ? (
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-slate-100">
            <img
              alt={data.name}
              className="h-full w-full object-cover"
              src={data.coverImageUrl}
            />
          </div>
        ) : null}
      </Link>
    </article>
  );
}
