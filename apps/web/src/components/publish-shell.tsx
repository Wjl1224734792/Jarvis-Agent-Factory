import type { ReactNode } from "react";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import logoUrl from "../../../../packages/shared/assets/logo/logo.jpg";
import { Link } from "react-router-dom";
import { SitePageDescription, SitePageEyebrow, SitePageHead, SitePageTitle } from "@/components/site-shell";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ImmersivePageShell } from "@/components/immersive-page-shell";
import { useAuthStore } from "@/features/auth/auth-store";
import { getAvatarImage } from "@/lib/aviation-media";
import { cn } from "@/lib/utils";

export function PublishShell(props: {
  eyebrow: string;
  title: string;
  description?: string;
  main: ReactNode;
  aside: ReactNode;
  className?: string;
  gridClassName?: string;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const displayName = currentUser?.displayName ?? "创作者";
  const avatarSrc =
    currentUser?.avatarUrl?.trim() || (currentUser?.id ? getAvatarImage(currentUser.id) : null);

  return (
    <ImmersivePageShell
      className={cn(
        "max-w-[1240px] gap-8 [&_.site-page-head]:gap-3 [&_.site-panel]:border-border/75",
        "[&_.site-panel]:bg-white [&_.site-panel]:shadow-none",
        props.className
      )}
      header={
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3 text-foreground" to={APP_ROUTES.feedHome}>
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border/75 bg-white">
                <img alt={`${APP_NAME} logo`} className="h-full w-full object-cover" src={logoUrl} />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  {APP_NAME}
                </span>
                <span className="text-sm text-muted-foreground">沉浸式创作空间</span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">当前身份</div>
                <div className="text-sm font-medium text-foreground">{displayName}</div>
              </div>
              <UserAvatar className="rounded-sm" displayName={displayName} size="lg" src={avatarSrc} />
            </div>
          </div>

          <SitePageHead className="gap-3">
            <SitePageEyebrow className="tracking-[0.22em]">{props.eyebrow}</SitePageEyebrow>
            <SitePageTitle className="text-[2.05rem] md:text-[2.5rem]">{props.title}</SitePageTitle>
            {props.description ? (
              <SitePageDescription className="max-w-[54rem] text-sm">{props.description}</SitePageDescription>
            ) : null}
          </SitePageHead>
        </div>
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
