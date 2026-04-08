import type { ReactNode } from "react";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SiteRail
} from "@/components/site-shell";
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
    <SitePage className={props.className ?? "mx-auto w-full max-w-[72rem] gap-4"}>
      <SitePageHead>
        <SitePageEyebrow>{props.eyebrow}</SitePageEyebrow>
        <SitePageTitle className="text-[2rem] md:text-[2.35rem]">{props.title}</SitePageTitle>
        {props.description ? (
          <SitePageDescription className="max-w-[44rem] text-sm">{props.description}</SitePageDescription>
        ) : null}
      </SitePageHead>

      <SiteGrid
        className={cn("items-start xl:grid-cols-[minmax(0,1fr)_18rem]", props.gridClassName)}
        variant="default"
      >
        <div className="space-y-4">{props.main}</div>
        <SiteRail className="top-[5.4rem]">{props.aside}</SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
