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

export function PublishShell(props: {
  eyebrow: string;
  title: string;
  description?: string;
  main: ReactNode;
  aside: ReactNode;
  className?: string;
}) {
  return (
    <SitePage className={props.className ?? "gap-5"}>
      <SitePageHead>
        <SitePageEyebrow>{props.eyebrow}</SitePageEyebrow>
        <SitePageTitle className="text-[2.35rem] md:text-[2.8rem]">{props.title}</SitePageTitle>
        {props.description ? (
          <SitePageDescription className="max-w-[56rem] text-sm">{props.description}</SitePageDescription>
        ) : null}
      </SitePageHead>

      <SiteGrid className="xl:grid-cols-[minmax(0,1fr)_340px]" variant="default">
        <div className="space-y-5">{props.main}</div>
        <SiteRail>{props.aside}</SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
