import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightIcon,
  BellIcon,
  CompassIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAvatarImage, getEditorialImage, getProfileBanner } from "../../lib/aviation-media";
import { useAuthStore } from "./auth-store";
import {
  createProfileViewModel,
  readStoredSettingsDraft,
  type ProfileFocusTab
} from "./profile-settings-state";

const profileTabs: Array<{ value: ProfileFocusTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "drafts", label: "Draft board" }
];

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const settingsDraft = readStoredSettingsDraft(user);
  const profile = createProfileViewModel(user, settingsDraft);
  const [activeTab, setActiveTab] = useState<ProfileFocusTab>("overview");

  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>Personal Center</SitePageEyebrow>
        <SitePageTitle>Profile Deck</SitePageTitle>
        <SitePageDescription>
          A session-backed cockpit for your identity, current writing momentum, and the most useful
          personal shortcuts in the web app.
        </SitePageDescription>
      </SitePageHead>

      <SitePanel className="overflow-hidden" variant="floating">
        <div className="relative h-64 overflow-hidden border-b border-border/80">
          <img
            alt={`${profile.displayName} banner`}
            className="h-full w-full object-cover"
            src={getProfileBanner(profile.displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-900/16 to-transparent" />
        </div>

        <SitePanelBody className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
            <Avatar className="-mt-20 size-32 rounded-[calc(var(--radius-panel)-0.05rem)] ring-4 ring-white" size="lg">
              <AvatarImage alt={profile.displayName} src={getAvatarImage(profile.displayName)} />
              <AvatarFallback>{profile.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="eyebrow">{profile.memberLabel}</Badge>
                <Badge variant="outline">{profile.callsign}</Badge>
                <Badge variant="tone">{profile.availability}</Badge>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="text-[2.4rem] font-semibold tracking-[-0.04em] text-foreground">
                  {profile.displayName}
                </div>
                <div className="text-lg font-medium text-primary">{profile.headline}</div>
                <p className="max-w-3xl text-base leading-8 text-muted-foreground">{profile.bio}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {profile.metrics.map((item) => (
              <div
                className="rounded-[calc(var(--radius-panel)-0.15rem)] border border-border/75 bg-surface-2/78 px-5 py-4"
                key={item.label}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-foreground">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <div className="flex flex-col gap-[var(--page-gap)]">
          <Tabs onValueChange={(value) => setActiveTab(value as ProfileFocusTab)} value={activeTab}>
            <TabsList variant="line">
              {profileTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent className="space-y-[var(--page-gap)]" value="overview">
              <SitePanel>
                <div className="grid gap-0 lg:grid-cols-[1.2fr_minmax(0,1fr)]">
                  <div className="min-h-[19rem] overflow-hidden border-b border-border/80 lg:border-b-0 lg:border-r">
                    <img
                      alt={profile.focusCards[0]!.title}
                      className="h-full w-full object-cover"
                      src={getEditorialImage(profile.focusCards[0]!.imageSeed)}
                    />
                  </div>
                  <SitePanelBody className="flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <Badge variant="eyebrow">{profile.focusCards[0]!.eyebrow}</Badge>
                      <div className="text-[2.2rem] font-semibold leading-tight tracking-[-0.04em] text-foreground">
                        {profile.focusCards[0]!.title}
                      </div>
                      <p className="text-base leading-8 text-muted-foreground">
                        {profile.focusCards[0]!.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                        {profile.focusCards[0]!.metrics.map((metric) => (
                          <span className="inline-flex items-center gap-2" key={metric.label}>
                            <SparklesIcon className="size-4 text-primary" />
                            {metric.label}: {metric.value}
                          </span>
                        ))}
                      </div>

                      <Button asChild variant="hero">
                        <Link to={profile.focusCards[0]!.href}>
                          {profile.focusCards[0]!.ctaLabel}
                          <ArrowRightIcon data-icon="inline-end" />
                        </Link>
                      </Button>
                    </div>
                  </SitePanelBody>
                </div>
              </SitePanel>

              <div className="grid gap-[var(--page-gap)] lg:grid-cols-2">
                {profile.focusCards.slice(1).map((card, index) => (
                  <Card key={card.id}>
                    <div className="overflow-hidden border-b border-border/80">
                      <img
                        alt={card.title}
                        className="h-52 w-full object-cover"
                        src={getEditorialImage(card.imageSeed, index + 1)}
                      />
                    </div>
                    <CardHeader>
                      <Badge variant="eyebrow">{card.eyebrow}</Badge>
                      <CardTitle className="text-2xl">{card.title}</CardTitle>
                      <CardDescription>{card.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {card.metrics.map((metric) => (
                          <div
                            className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-surface-2/78 px-4 py-4"
                            key={metric.label}
                          >
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              {metric.label}
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-foreground">
                              {metric.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button asChild className="w-full" variant="outline">
                        <Link to={card.href}>{card.ctaLabel}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent className="space-y-[var(--page-gap)]" value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Activity briefing</CardTitle>
                  <CardDescription>
                    This panel is intentionally front-end scoped. It reflects session-aware shortcuts
                    and the current product surface, not a dedicated profile activity API.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {profile.activityNotes.map((note) => (
                    <div
                      className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/72 px-5 py-5 text-sm leading-7 text-muted-foreground"
                      key={note}
                    >
                      {note}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <SitePanel variant="highlight">
                <SitePanelBody className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Notification lane", value: "Live", icon: BellIcon },
                    { label: "Profile controls", value: "Ready", icon: UserRoundIcon },
                    { label: "Settings sync", value: "Local", icon: ShieldCheckIcon }
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-white/10 px-5 py-5" key={item.label}>
                        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-sky-100/82">
                          <Icon className="size-4" />
                          {item.label}
                        </div>
                        <div className="mt-3 text-3xl font-semibold">{item.value}</div>
                      </div>
                    );
                  })}
                </SitePanelBody>
              </SitePanel>
            </TabsContent>

            <TabsContent className="space-y-[var(--page-gap)]" value="drafts">
              <Card variant="muted">
                <CardHeader>
                  <CardTitle className="text-2xl">Draft board</CardTitle>
                  <CardDescription>
                    The current draft board is intentionally local-first. It gives your profile a
                    useful working surface without inventing a server-side draft system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {profile.draftNotes.map((note) => (
                    <div
                      className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-card/86 px-5 py-5 text-sm leading-7 text-muted-foreground"
                      key={note}
                    >
                      {note}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SiteRail>
          <Card variant="muted">
            <CardHeader>
              <CardTitle>Session identity</CardTitle>
              <CardDescription>
                Lightweight profile facts derived from the authenticated user summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Callsign", value: profile.callsign, icon: UserRoundIcon },
                { label: "Home base", value: profile.homeBase, icon: MapPinIcon },
                { label: "Status", value: profile.availability, icon: CompassIcon }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-4 py-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      {item.label}
                    </div>
                    <div className="mt-2 text-base font-medium text-foreground">{item.value}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <SitePageEyebrow className="text-sky-100/78">Quick actions</SitePageEyebrow>
              <div className="text-[1.9rem] font-semibold leading-tight">Keep the deck moving</div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/86">
                Jump straight to the parts of the product that already work end-to-end today.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { to: APP_ROUTES.notifications, label: "Open alerts" },
                  { to: APP_ROUTES.webSettings, label: "Open settings" },
                  { to: APP_ROUTES.compose, label: "Start a new draft" }
                ].map((entry) => (
                  <Button
                    asChild
                    className="justify-between bg-white/10 text-white hover:bg-white/16"
                    key={entry.to}
                    variant="panel"
                  >
                    <Link to={entry.to}>
                      {entry.label}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
