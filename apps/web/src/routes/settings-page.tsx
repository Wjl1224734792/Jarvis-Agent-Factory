import { APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  ChevronRightIcon,
  CompassIcon,
  Link2Icon,
  LockKeyholeIcon,
  LogOutIcon,
  MapPinIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserRoundIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import {
  clearStoredSettingsDraft,
  createDeletionMessage,
  createProfileViewModel,
  createSettingsDraft,
  markSettingsSaved,
  persistSettingsDraft,
  readStoredSettingsDraft,
  setProfileVisibility,
  toggleSettingsFlag,
  updateSettingsField,
  type ProfileVisibility,
  type SettingsDraft
} from "../features/auth/profile-settings-state";
import { apiClient } from "../lib/api-client";

const settingsSections = [
  { id: "profile", label: "Profile copy", icon: UserRoundIcon },
  { id: "alerts", label: "Alerts", icon: BellIcon },
  { id: "security", label: "Security", icon: ShieldCheckIcon },
  { id: "danger", label: "Danger zone", icon: TriangleAlertIcon }
] as const;

const visibilityOptions: Array<{ value: ProfileVisibility; label: string; summary: string }> = [
  {
    value: "community",
    label: "Community",
    summary: "Anyone in the product can see your profile summary."
  },
  {
    value: "followers",
    label: "Followers",
    summary: "Keep profile details focused on people already following you."
  },
  {
    value: "private",
    label: "Private",
    summary: "Treat profile details as a local note until backend controls exist."
  }
];

type SettingsSectionId = (typeof settingsSections)[number]["id"];

function SectionButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof UserRoundIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center justify-between rounded-[calc(var(--radius-control)+0.08rem)] border px-4 py-4 text-left transition ${
        active
          ? "border-primary/18 bg-primary/8 text-primary shadow-[var(--shadow-soft)]"
          : "border-border/80 bg-background/76 text-foreground hover:border-primary/16 hover:bg-accent/56"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-[calc(var(--radius-control)-0.08rem)] bg-surface-2/82">
          <Icon className="size-4.5" />
        </span>
        <span className="font-medium">{label}</span>
      </span>
      <ChevronRightIcon className="size-4" />
    </button>
  );
}

function SettingToggleRow({
  title,
  description,
  enabled,
  onToggle
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/72 px-5 py-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="text-base font-medium text-foreground">{title}</div>
        <div className="text-sm leading-7 text-muted-foreground">{description}</div>
      </div>
      <Button onClick={onToggle} type="button" variant={enabled ? "panel" : "outline"}>
        {enabled ? "On" : "Off"}
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [draft, setDraft] = useState<SettingsDraft>(() => readStoredSettingsDraft(user));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    current: "",
    next: "",
    confirm: ""
  });

  useEffect(() => {
    setDraft(readStoredSettingsDraft(user));
  }, [user]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [statusMessage]);

  const profilePreview = createProfileViewModel(user, draft);

  function saveDraftLocally(message: string) {
    const nextDraft = markSettingsSaved(draft);
    persistSettingsDraft(user, nextDraft);
    setDraft(nextDraft);
    setStatusMessage(message);
  }

  function resetDraftLocally() {
    const nextDraft = createSettingsDraft(user);
    clearStoredSettingsDraft(user);
    setDraft(nextDraft);
    setPasswordDraft({
      current: "",
      next: "",
      confirm: ""
    });
    setStatusMessage("Local settings have been reset.");
  }

  function stagePasswordChange() {
    if (!passwordDraft.current || !passwordDraft.next || !passwordDraft.confirm) {
      setStatusMessage("Fill in the password fields to stage a local-only password update.");
      return;
    }

    if (passwordDraft.next !== passwordDraft.confirm) {
      setStatusMessage("The new password and confirmation do not match.");
      return;
    }

    setPasswordDraft({
      current: "",
      next: "",
      confirm: ""
    });
    saveDraftLocally("Password change staged locally. No API request was sent.");
  }

  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>Settings Center</SitePageEyebrow>
        <SitePageTitle>Control Deck</SitePageTitle>
        <SitePageDescription>
          This page is intentionally local-first for now. Session identity and logout stay real,
          while profile copy, privacy, and alert routing remain in-browser until dedicated settings
          APIs are ready.
        </SitePageDescription>
      </SitePageHead>

      <SiteGrid variant="detail">
        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-3">
              {settingsSections.map((section) => (
                <SectionButton
                  active={section.id === activeSection}
                  icon={section.icon}
                  key={section.id}
                  label={section.label}
                  onClick={() => {
                    setActiveSection(section.id);
                  }}
                />
              ))}
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <SitePageEyebrow className="text-sky-100/78">Live status</SitePageEyebrow>
              <div className="text-[1.9rem] font-semibold leading-tight">Session-backed core</div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/86">
                The current login session is real. Local profile and settings notes are saved in
                this browser only.
              </p>
              <div className="grid gap-3">
                {[
                  { label: "Callsign", value: profilePreview.callsign },
                  { label: "Visibility", value: draft.visibility },
                  { label: "Saved", value: draft.lastSavedLabel }
                ].map((item) => (
                  <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-white/10 px-4 py-4" key={item.label}>
                    <div className="text-xs uppercase tracking-[0.2em] text-sky-100/82">
                      {item.label}
                    </div>
                    <div className="mt-2 text-base font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
              <Button
                asChild
                className="justify-between bg-white/10 text-white hover:bg-white/16"
                variant="panel"
              >
                <Link to={APP_ROUTES.webProfile}>
                  Open profile deck
                  <ChevronRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>

        <div className="flex min-w-0 flex-col gap-[var(--page-gap)]">
          <Card variant="muted">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="eyebrow">Local-first</Badge>
                <Badge variant="outline">{profilePreview.memberLabel}</Badge>
                {draft.hasPendingChanges ? <Badge>Unsaved changes</Badge> : <Badge variant="tone">In sync</Badge>}
              </div>
              <CardTitle className="text-[2rem]">{profilePreview.displayName}</CardTitle>
              <CardDescription>
                Use this control deck to shape how your profile reads and how alerts should behave
                inside the current browser session.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Home base", value: profilePreview.homeBase, icon: MapPinIcon },
                { label: "Routing", value: activeSection, icon: CompassIcon },
                { label: "Alerts", value: draft.notifyComments ? "Comments on" : "Comments off", icon: BellIcon }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-card/86 px-5 py-5"
                    key={item.label}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      {item.label}
                    </div>
                    <div className="mt-3 text-lg font-medium text-foreground">{item.value}</div>
                  </div>
                );
              })}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-3">
              <Button onClick={resetDraftLocally} type="button" variant="ghost">
                <RefreshCcwIcon data-icon="inline-start" />
                Reset local draft
              </Button>
              <Button
                onClick={() => {
                  saveDraftLocally("Settings saved to this browser.");
                }}
                type="button"
                variant="hero"
              >
                Save local changes
              </Button>
            </CardFooter>
          </Card>

          <Alert>
            <Link2Icon className="size-4" />
            <AlertTitle>Real today vs. staged today</AlertTitle>
            <AlertDescription>
              Login state, protected routes, alerts access, and logout are wired into the real app.
              Profile copy, visibility, password flows, and deletion requests are clearly marked as
              local-only until backend support lands.
            </AlertDescription>
          </Alert>

          {statusMessage ? (
            <Alert>
              <ShieldCheckIcon className="size-4" />
              <AlertTitle>Update captured</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          {activeSection === "profile" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-[1.8rem]">Profile copy</CardTitle>
                <CardDescription>
                  These fields shape the profile summary locally, so you can preview tone and
                  direction before real profile APIs are added.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
                  <div className="space-y-3">
                    <label
                      className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
                      htmlFor="settings-profile-bio"
                    >
                      Profile bio
                    </label>
                    <Textarea
                      className="min-h-40 resize-y"
                      id="settings-profile-bio"
                      onChange={(event) => {
                        setDraft((current) => updateSettingsField(current, "bio", event.target.value));
                      }}
                      value={draft.bio}
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label
                        className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
                        htmlFor="settings-home-base"
                      >
                        Home base
                      </label>
                      <Input
                        id="settings-home-base"
                        onChange={(event) => {
                          setDraft((current) => updateSettingsField(current, "homeBase", event.target.value));
                        }}
                        value={draft.homeBase}
                      />
                    </div>

                    <div className="space-y-3">
                      <label
                        className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
                        htmlFor="settings-recovery-phone"
                      >
                        Recovery phone
                      </label>
                      <Input
                        id="settings-recovery-phone"
                        onChange={(event) => {
                          setDraft((current) => updateSettingsField(current, "phone", event.target.value));
                        }}
                        type="tel"
                        value={draft.phone}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Visibility mode
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {visibilityOptions.map((option) => (
                      <button
                        className={`rounded-[calc(var(--radius-panel)-0.2rem)] border px-4 py-4 text-left transition ${
                          draft.visibility === option.value
                            ? "border-primary/18 bg-primary/8 shadow-[var(--shadow-soft)]"
                            : "border-border/75 bg-background/76 hover:border-primary/16 hover:bg-accent/56"
                        }`}
                        key={option.value}
                        onClick={() => {
                          setDraft((current) => setProfileVisibility(current, option.value));
                        }}
                        type="button"
                      >
                        <div className="text-base font-medium text-foreground">{option.label}</div>
                        <div className="mt-2 text-sm leading-7 text-muted-foreground">
                          {option.summary}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  onClick={() => {
                    saveDraftLocally("Profile copy updated locally.");
                  }}
                  type="button"
                  variant="hero"
                >
                  Save profile copy
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {activeSection === "alerts" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-[1.8rem]">Alerts and routing</CardTitle>
                <CardDescription>
                  Keep the product noisy where it matters and quiet where it does not. These
                  switches stay local to the current browser for now.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <SettingToggleRow
                  description="Surface comment replies and conversation nudges in the alerts center."
                  enabled={draft.notifyComments}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "notifyComments"));
                  }}
                  title="Comment replies"
                />
                <SettingToggleRow
                  description="Keep track of direct mentions from rankings, posts, and comments."
                  enabled={draft.notifyMentions}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "notifyMentions"));
                  }}
                  title="Mentions and tags"
                />
                <SettingToggleRow
                  description="Bundle lower-priority updates into a lighter digest summary."
                  enabled={draft.emailDigest}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "emailDigest"));
                  }}
                  title="Email-style digest"
                />
                <SettingToggleRow
                  description="Expose flying hours and activity counters inside profile context cards."
                  enabled={draft.showFlightHours}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "showFlightHours"));
                  }}
                  title="Show flight-hour highlights"
                />
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-3">
                <Button asChild type="button" variant="outline">
                  <Link to={APP_ROUTES.notifications}>Open alerts center</Link>
                </Button>
                <Button
                  onClick={() => {
                    saveDraftLocally("Alert routing updated locally.");
                  }}
                  type="button"
                  variant="hero"
                >
                  Save alert settings
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {activeSection === "security" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-[1.8rem]">Security posture</CardTitle>
                <CardDescription>
                  The login session is real, but the controls below are a front-end rehearsal for
                  future account-security endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <SettingToggleRow
                  description="Toggle a placeholder for future two-factor login protection."
                  enabled={draft.twoFactorEnabled}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "twoFactorEnabled"));
                  }}
                  title="Two-factor protection"
                />
                <SettingToggleRow
                  description="Receive local reminders when another session should be reviewed."
                  enabled={draft.sessionAlerts}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "sessionAlerts"));
                  }}
                  title="Session alerts"
                />

                <div className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/72 p-5">
                  <div className="flex items-center gap-3 text-base font-medium text-foreground">
                    <LockKeyholeIcon className="size-5 text-primary" />
                    Password rehearsal
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Input
                      autoComplete="current-password"
                      id="settings-current-password"
                      onChange={(event) => {
                        setPasswordDraft((current) => ({
                          ...current,
                          current: event.target.value
                        }));
                      }}
                      placeholder="Current password"
                      type="password"
                      value={passwordDraft.current}
                    />
                    <Input
                      autoComplete="new-password"
                      id="settings-next-password"
                      onChange={(event) => {
                        setPasswordDraft((current) => ({
                          ...current,
                          next: event.target.value
                        }));
                      }}
                      placeholder="New password"
                      type="password"
                      value={passwordDraft.next}
                    />
                    <Input
                      autoComplete="new-password"
                      id="settings-confirm-password"
                      onChange={(event) => {
                        setPasswordDraft((current) => ({
                          ...current,
                          confirm: event.target.value
                        }));
                      }}
                      placeholder="Confirm new password"
                      type="password"
                      value={passwordDraft.confirm}
                    />
                  </div>
                  <div className="mt-4 text-sm leading-7 text-muted-foreground">
                    No password mutation request will be sent in this round. This form exists so
                    the page feels complete before backend support is available.
                  </div>
                  <div className="sr-only">
                    <label htmlFor="settings-current-password">Current password</label>
                    <label htmlFor="settings-next-password">New password</label>
                    <label htmlFor="settings-confirm-password">Confirm new password</label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={stagePasswordChange} type="button" variant="hero">
                  Stage password update
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {activeSection === "danger" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-[1.8rem]">Danger zone</CardTitle>
                <CardDescription>
                  Account deletion still needs backend support. We keep the intent explicit here
                  without pretending the destructive flow already exists.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Alert variant="destructive">
                  <TriangleAlertIcon className="size-4" />
                  <AlertTitle>Deletion remains staged only</AlertTitle>
                  <AlertDescription>
                    Arm the request if you want to test the UI flow. Nothing is sent to the server,
                    and the actual logout entry remains the only live account action on this page.
                  </AlertDescription>
                </Alert>

                <SettingToggleRow
                  description="Require an explicit local confirmation before the delete button becomes meaningful."
                  enabled={draft.deletionArmed}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "deletionArmed"));
                  }}
                  title="Arm deletion request"
                />

                <div className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-red-200 bg-red-50/80 px-5 py-5 text-sm leading-7 text-red-700">
                  {createDeletionMessage(draft)}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-3">
                <Button
                  onClick={() => {
                    setStatusMessage(createDeletionMessage(draft));
                  }}
                  type="button"
                  variant="destructive"
                >
                  <TriangleAlertIcon data-icon="inline-start" />
                  Stage deletion request
                </Button>

                <Button
                  onClick={() => {
                    void apiClient
                      .logout()
                      .then(() => {
                        setAnonymous();
                        navigate(APP_ROUTES.feedHome);
                      })
                      .catch((error: unknown) => {
                        setError(error instanceof Error ? error.message : "Log out failed");
                      });
                  }}
                  type="button"
                  variant="outline"
                >
                  <LogOutIcon data-icon="inline-start" />
                  Log out now
                </Button>
              </CardFooter>
            </Card>
          ) : null}
        </div>
      </SiteGrid>
    </SitePage>
  );
}
