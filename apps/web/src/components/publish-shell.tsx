import type { ReactNode } from "react";
import { SitePageDescription, SitePageEyebrow, SitePageHead, SitePageTitle } from "@/components/site-shell";
import { ImmersivePageShell } from "@/components/immersive-page-shell";
import { cn } from "@/lib/utils";

export function PublishShell(props: {
  eyebrow: string;
  title: string;
  description?: string;
  main: ReactNode;
  aside: ReactNode;
  className?: string;
  /** 覆盖主栏/侧栏网格，例如 `xl:grid-cols-[minmax(0,1fr)_22rem]` */
  gridClassName?: string;
}) {
  return (
    <ImmersivePageShell
      className={cn(
        "max-w-[1240px] gap-8 [&_.site-page-head]:gap-3 [&_.site-panel]:border-border/75",
        "[&_.site-panel]:bg-white [&_.site-panel]:shadow-none",
        props.className
      )}
      header={
        <SitePageHead className="gap-3">
          <SitePageEyebrow className="tracking-[0.22em]">{props.eyebrow}</SitePageEyebrow>
          <SitePageTitle className="text-[2.05rem] md:text-[2.5rem]">{props.title}</SitePageTitle>
          {props.description ? (
            <SitePageDescription className="max-w-[54rem] text-sm">{props.description}</SitePageDescription>
          ) : null}
        </SitePageHead>
      }
    >
      <section
        className={cn(
          "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]",
          "[&>aside]:space-y-4",
          props.gridClassName
        )}
      >
        <div className="space-y-4">{props.main}</div>
        <aside>{props.aside}</aside>
      </section>
    </ImmersivePageShell>
  );
}
