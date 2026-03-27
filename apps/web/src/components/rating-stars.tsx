import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClassNames = {
  xs: {
    wrapper: "gap-0.5",
    icon: "size-3",
    button: "p-0.5"
  },
  sm: {
    wrapper: "gap-0.75",
    icon: "size-3.5",
    button: "p-0.5"
  },
  md: {
    wrapper: "gap-1",
    icon: "size-4",
    button: "p-0.75"
  },
  lg: {
    wrapper: "gap-1.25",
    icon: "size-5",
    button: "p-1"
  }
} as const;

type RatingStarsProps = {
  value: number;
  className?: string;
  iconClassName?: string;
  onSelect?: (value: number) => void;
  size?: keyof typeof sizeClassNames;
  tone?: "auto" | "rating" | "danger" | "muted";
};

export function toFiveStarRating(score: number) {
  return Math.max(0, Math.min(5, score / 2));
}

export function RatingStars({
  value,
  className,
  iconClassName,
  onSelect,
  size = "sm",
  tone = "auto"
}: RatingStarsProps) {
  const normalizedValue = Math.max(0, Math.min(5, value));
  const filledStars = Math.round(normalizedValue);
  const sizeClassName = sizeClassNames[size];
  const toneClassName =
    tone === "danger"
      ? "text-destructive"
      : tone === "muted"
        ? "text-muted-foreground/45"
        : tone === "rating"
          ? "text-rating-orange"
          : normalizedValue <= 0
            ? "text-muted-foreground/45"
            : normalizedValue < 3
              ? "text-destructive"
              : "text-rating-orange";

  return (
    <div className={cn("inline-flex items-center", sizeClassName.wrapper, toneClassName, className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const icon = (
          <StarIcon
            className={cn(sizeClassName.icon, iconClassName)}
            fill={index < filledStars ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        );

        if (!onSelect) {
          return (
            <span className="inline-flex" key={index}>
              {icon}
            </span>
          );
        }

        return (
          <button
            className={cn(
              "rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              sizeClassName.button
            )}
            key={index}
            onClick={() => onSelect(index + 1)}
            type="button"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
