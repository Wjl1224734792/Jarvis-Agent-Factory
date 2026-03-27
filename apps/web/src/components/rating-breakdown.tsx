import { cn } from "@/lib/utils";

export type RatingBreakdownEntry = {
  score: number;
  count: number;
};

type RatingBreakdownProps = {
  entries: RatingBreakdownEntry[];
  className?: string;
  totalCount?: number;
};

export function RatingBreakdown({ entries, className, totalCount }: RatingBreakdownProps) {
  const normalizedEntries = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: entries.find((entry) => entry.score === score)?.count ?? 0
  }));
  const resolvedTotalCount =
    totalCount ?? normalizedEntries.reduce((sum, entry) => sum + entry.count, 0);
  const maxCount = Math.max(...normalizedEntries.map((entry) => entry.count), 1);

  return (
    <div className={cn("space-y-2.5", className)}>
      {normalizedEntries.map((entry) => (
        <div className="grid items-center gap-2.5 grid-cols-[14px_minmax(0,1fr)_40px]" key={entry.score}>
          <div className="text-[0.72rem] font-medium tabular-nums text-muted-foreground">{entry.score}</div>
          <div className="h-2 overflow-hidden rounded-full bg-sky-100/90">
            <div
              className="h-full rounded-full bg-rating-orange"
              style={{ width: `${(entry.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="text-right text-[0.72rem] tabular-nums text-muted-foreground">
            {resolvedTotalCount ? `${Math.round((entry.count / resolvedTotalCount) * 100)}%` : "0%"}
          </div>
        </div>
      ))}
    </div>
  );
}
