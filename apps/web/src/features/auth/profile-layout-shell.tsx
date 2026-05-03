import type { ReactNode } from "react";
import { SitePage, SitePanel } from "@/components/site-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ProfileTabDef {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

export function ProfileLayoutShell(props: {
  banner: ReactNode;
  metaBar: ReactNode;
  statusHint?: ReactNode;
  tabs: ProfileTabDef[];
  activeTab: string;
  onTabChange: (value: string) => void;
  filterBar?: ReactNode;
  children: ReactNode;
  alert?: ReactNode;
  className?: string;
}) {
  return (
    <SitePage className={cn("mx-auto w-full max-w-[72rem] gap-4", props.className)}>
      {props.alert ? <div className="w-full">{props.alert}</div> : null}

      <SitePanel className="overflow-hidden !border-0" variant="floating">
        {props.banner}
        {props.metaBar}
        {props.statusHint ? (
          <div className="border-t border-border/60">{props.statusHint}</div>
        ) : null}
      </SitePanel>

      <Tabs onValueChange={props.onTabChange} value={props.activeTab}>
        <TabsList variant="line">
          {props.tabs.map((tab) => (
            <TabsTrigger
              disabled={tab.disabled}
              key={tab.value}
              title={tab.title}
              value={tab.value}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent className="space-y-4" value={props.activeTab}>
          {props.filterBar ? (
            <div className="flex flex-wrap items-center gap-2">{props.filterBar}</div>
          ) : null}
          {props.children}
        </TabsContent>
      </Tabs>
    </SitePage>
  );
}
