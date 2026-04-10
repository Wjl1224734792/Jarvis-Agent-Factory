import type { ReactNode } from "react";
import { SitePage } from "@/components/site-shell";
import { cn } from "@/lib/utils";

export function ImmersivePageShell(props: {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SitePage
      className={cn(
        "mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8",
        "[&_.site-panel]:rounded-none [&_.site-panel]:border [&_.site-panel]:border-border/70 [&_.site-panel]:bg-white",
        "[&_.site-panel--muted]:bg-[color-mix(in_srgb,var(--surface-1)_94%,white)]",
        "[&_.site-panel--floating]:rounded-none [&_.site-panel--floating]:shadow-none",
        props.className
      )}
    >
      {props.header ? <div className="border-b border-border/75 pb-4">{props.header}</div> : null}
      {props.children}
    </SitePage>
  );
}
