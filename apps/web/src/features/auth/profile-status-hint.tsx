import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProfileStatusHint(props: {
  title: string;
  description?: string;
  tone?: "default" | "highlight";
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-5 py-3 text-sm md:px-6",
        props.tone === "highlight"
          ? "bg-primary/5 text-primary"
          : "bg-muted/30 text-muted-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{props.title}</span>
        {props.description ? (
          <span className="text-muted-foreground">{props.description}</span>
        ) : null}
      </div>
      {props.children ? <div className="flex gap-2">{props.children}</div> : null}
    </div>
  );
}
