import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProfileListPagination(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-4">
      <Button
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(props.page - 1)}
        size="sm"
        type="button"
        variant="outline"
      >
        上一页
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        {props.page} / {props.totalPages}
      </span>
      <Button
        disabled={props.page >= props.totalPages}
        onClick={() => props.onPageChange(props.page + 1)}
        size="sm"
        type="button"
        variant="outline"
      >
        下一页
      </Button>
    </div>
  );
}

export function ProfileMetricStrip(props: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border border-border/70 bg-surface-2/72 px-4 py-3">
      <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </div>
      <div className="text-lg font-semibold text-foreground">{props.value}</div>
    </div>
  );
}

export function ProfileOverviewCard(props: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "highlight";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card
      className={cn("!border-0", props.className)}
      size="sm"
      variant={props.tone === "highlight" ? "highlight" : "muted"}
    >
      <CardContent className="space-y-3 pt-[var(--panel-padding)]">
        <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
          {props.eyebrow}
        </div>
        <div className="space-y-1.5">
          <div className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {props.title}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
        </div>
        {props.children}
      </CardContent>
    </Card>
  );
}
