import { APP_ROUTES } from "@feijia/shared";
import { HeartIcon, MessageSquareIcon, PenSquareIcon, TrendingUpIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SitePage,
  SitePanel,
  SitePanelBody
} from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAvatarImage,
  getEditorialImage,
  getProfileBanner
} from "../../lib/aviation-media";
import { useAuthStore } from "./auth-store";

const profileTabs = ["all", "images", "video", "drafts"] as const;

const showcaseCards: Array<{
  eyebrow: string;
  title: string;
  summary: string;
  imageSeed?: string;
  metrics?: string;
  comments?: string;
  action: string;
}> = [
  {
    eyebrow: "Flightlog",
    title: "Dawn Patrol: Chasing the light over the Cascades",
    summary:
      "The visibility was perfect this morning. Took the Cessna out for a quick 200nm loop before the clouds rolled in...",
    imageSeed: "profile-dawn",
    metrics: "124",
    comments: "18",
    action: "Edit Post"
  },
  {
    eyebrow: "Review",
    title: "Upgrading the Avionics: Garmin G1000 NXi Hands-on",
    summary:
      "After 50 hours with the new NXi suite, here is why the situational awareness is a total game-changer for IFR flight...",
    imageSeed: "profile-garmin",
    metrics: "892",
    comments: "56",
    action: "Edit Post"
  },
  {
    eyebrow: "Travelogue",
    title: "The Best Island Runways in the Southeast",
    summary:
      "Landing at Cedar Key is always an adventure. The runway seems to rise right out of the water and the breeze keeps you honest...",
    action: "Continue Writing"
  }
] as const;

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.displayName ?? "Aero_Explorer";

  return (
    <SitePage>
      <SitePanel>
        <div className="relative h-56 overflow-hidden border-b border-border/80">
          <img
            alt="profile banner"
            className="h-full w-full object-cover"
            src={getProfileBanner(displayName)}
          />
        </div>
        <SitePanelBody className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
            <Avatar className="-mt-20 size-36 rounded-[calc(var(--radius-panel)-0.15rem)] ring-4 ring-white" size="lg">
              <AvatarImage alt={displayName} src={getAvatarImage(displayName)} />
              <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="eyebrow">Aviation Precision</Badge>
                <Badge variant="outline">Pilot Journal</Badge>
              </div>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                Private pilot & aviation enthusiast. Capturing the world from 10,000 feet. Always
                looking for the next runway.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            {[
              { value: "1.2k", label: "Followers" },
              { value: "482", label: "Following" },
              { value: "8.5k", label: "Likes" }
            ].map((item) => (
              <div className="min-w-[110px]" key={item.label}>
                <div className="text-4xl font-semibold text-primary">{item.value}</div>
                <div className="mt-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </div>
              </div>
            ))}
            <Button size="lg" type="button" variant="panel">
              Edit Profile
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>

      <Tabs defaultValue="all" value="all">
        <TabsList variant="line">
          {profileTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-[var(--page-gap)] xl:grid-cols-2">
        {showcaseCards.slice(0, 2).map((card, index) => (
          <SitePanel key={card.title}>
            <div className="overflow-hidden border-b border-border/80">
              <img
                alt={card.title}
                className="h-72 w-full object-cover transition duration-500 hover:scale-[1.03]"
                src={getEditorialImage(card.imageSeed!, index)}
              />
            </div>
            <SitePanelBody className="space-y-4">
              <Badge variant="eyebrow">{card.eyebrow}</Badge>
              <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">
                {card.title}
              </h2>
              <p className="text-base leading-8 text-muted-foreground">{card.summary}</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <HeartIcon className="size-4" />
                    {card.metrics}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MessageSquareIcon className="size-4" />
                    {card.comments}
                  </span>
                </div>
                <Button type="button" variant="ghost">
                  {card.action}
                </Button>
              </div>
            </SitePanelBody>
          </SitePanel>
        ))}

        <Card variant="muted">
          <CardContent className="flex h-full flex-col justify-between py-7">
            <div>
              <Badge variant="eyebrow">{showcaseCards[2]!.eyebrow} · Draft</Badge>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-foreground">
                {showcaseCards[2]!.title}
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                "{showcaseCards[2]!.summary}"
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="rounded-full bg-background/72 px-4 py-2 text-sm text-muted-foreground">
                LAST EDITED: OCT 24
              </div>
              <Button asChild variant="hero">
                <Link to={APP_ROUTES.compose}>
                  <PenSquareIcon data-icon="inline-start" />
                  {showcaseCards[2]!.action}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <SitePanel className="xl:col-start-2" variant="highlight">
          <SitePanelBody className="space-y-6">
            <div className="flex size-14 items-center justify-center rounded-[calc(var(--radius-control)+0.1rem)] bg-white/14">
              <TrendingUpIcon className="size-7" />
            </div>
            <div className="text-4xl font-semibold">Monthly Activity Reach</div>
            <p className="text-base leading-8 text-panel-highlight-foreground/86">
              Your posts reached 12.4k aviation fans this month. That’s up 15% from September.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { value: "2.4k", label: "Views" },
                { value: "152", label: "Shares" }
              ].map((item) => (
                <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-white/10 px-6 py-6" key={item.label}>
                  <div className="text-5xl font-semibold">{item.value}</div>
                  <div className="mt-2 text-sm uppercase tracking-[0.24em] text-sky-100/78">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </SitePanelBody>
        </SitePanel>
      </div>
    </SitePage>
  );
}
