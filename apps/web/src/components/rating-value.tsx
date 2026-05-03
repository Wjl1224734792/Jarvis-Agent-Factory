import { cn } from "@/lib/utils";

const sizeClassNames = {
  sm: "text-[1rem]",
  md: "text-[1.18rem]",
  lg: "text-[1.5rem]",
  xl: "text-[2.35rem]"
} as const;

export function formatRatingValue(score: number, placeholder = "暂无评分") {
  return score > 0 ? score.toFixed(1) : placeholder;
}

export function RatingValue({
  score,
  size = "md",
  placeholder = "暂无评分",
  className
}: {
  score: number;
  size?: keyof typeof sizeClassNames;
  placeholder?: string;
  className?: string;
}) {
  const hasScore = score > 0;

  return (
    <span
      className={cn(
        "font-semibold leading-none tracking-[-0.03em]",
        hasScore ? "text-rating-blue" : "text-muted-foreground",
        sizeClassNames[size],
        className
      )}
    >
      {formatRatingValue(score, placeholder)}
    </span>
  );
}
