import {
  BanIcon,
  ChevronRightIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  SmartphoneIcon
} from "lucide-react";
import {
  SiteGrid,
  SitePage,
  SitePageEyebrow,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const settingsSections = ["账号安全", "隐私设置", "注销账号"] as const;

export function SettingsPage() {
  return (
    <SitePage>
      <SiteGrid variant="detail">
        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              {settingsSections.map((section, index) => (
                <button
                  className={`flex w-full items-center justify-between rounded-[calc(var(--radius-control)+0.1rem)] border px-5 py-4 text-left transition ${
                    index === 0
                      ? "border-primary/20 bg-primary/8 text-primary"
                      : "border-border/80 bg-background text-foreground"
                  }`}
                  key={section}
                  type="button"
                >
                  <span className="font-medium">{section}</span>
                  <ChevronRightIcon className="size-4" />
                </button>
              ))}
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <SitePageEyebrow className="text-sky-100/78">Security Status</SitePageEyebrow>
              <div className="text-[2rem] font-semibold leading-tight">Protect Your Wings</div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/84">
                Enable two-factor authentication for enhanced flight data protection.
              </p>
              <Button
                className="bg-white text-slate-900 hover:bg-white/92"
                type="button"
                variant="panel"
              >
                Upgrade Now
              </Button>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>

        <div className="flex flex-col gap-[var(--page-gap)]">
          <Card>
            <CardContent className="space-y-8 py-8">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-[calc(var(--radius-control)+0.05rem)] bg-primary/10 text-primary">
                  <LockKeyholeIcon className="size-6" />
                </div>
                <div>
                  <div className="text-4xl font-semibold text-foreground">Password Setting</div>
                  <div className="mt-2 text-base text-muted-foreground">
                    Update your login credentials regularly
                  </div>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {["New Password", "Confirm Password"].map((label) => (
                  <div className="space-y-3" key={label}>
                    <div className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      {label}
                    </div>
                    <div className="rounded-[calc(var(--radius-control)+0.05rem)] bg-muted px-5 py-5 text-xl tracking-[0.38em] text-muted-foreground">
                      ••••••••
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="lg" type="button" variant="hero">
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardContent className="space-y-8 py-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex size-14 items-center justify-center rounded-[calc(var(--radius-control)+0.05rem)] bg-amber-100 text-amber-700">
                    <SmartphoneIcon className="size-6" />
                  </div>
                  <div>
                    <div className="text-4xl font-semibold text-foreground">Phone Verification</div>
                    <div className="mt-2 text-base text-muted-foreground">
                      Manage your recovery mobile number
                    </div>
                  </div>
                </div>
                <Badge variant="tone">VERIFIED</Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-6 py-5">
                <div className="text-4xl font-semibold tracking-[0.18em] text-foreground">
                  +86 138 •••• 5920
                </div>
                <Button type="button" variant="ghost">
                  Change Phone Number
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-8 py-8">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-[calc(var(--radius-control)+0.05rem)] bg-red-100 text-red-600">
                  <BanIcon className="size-6" />
                </div>
                <div>
                  <div className="text-4xl font-semibold text-foreground">Account Cancellation</div>
                  <div className="mt-2 text-base text-muted-foreground">
                    Permanently remove your account and all associated flight logs
                  </div>
                </div>
              </div>

              <SitePanel className="border-red-200 bg-red-50 shadow-none" variant="muted">
                <SitePanelBody className="space-y-4">
                  <div className="flex items-center gap-3 text-xl font-semibold text-red-700">
                    <ShieldCheckIcon className="size-5" />
                    Critical Information
                  </div>
                  <p className="max-w-4xl text-sm leading-8 text-red-700/88">
                    Once the deletion process is initiated, there is a 7-day cooling-off period.
                    You can cancel the deletion at any time during this window by logging back into
                    your FeiJia account. After 7 days, all data will be purged.
                  </p>
                </SitePanelBody>
              </SitePanel>

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm italic text-muted-foreground">
                  Session ID: FJ-982-S-SECURE
                </div>
                <Button size="lg" type="button" variant="outline">
                  Initiate Account Deletion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteGrid>
    </SitePage>
  );
}
