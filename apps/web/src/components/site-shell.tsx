import * as React from "react";
import { cn } from "@/lib/utils";

export function SiteShell({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("site-shell", className)} {...props} />;
}

export function SitePage({ className, ...props }: React.ComponentProps<"main">) {
  return <main className={cn("site-page", className)} {...props} />;
}

export function SitePageHead({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("site-page-head", className)} {...props} />;
}

export function SitePageEyebrow({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("site-page-eyebrow", className)} {...props} />;
}

export function SitePageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("site-page-title", className)} {...props} />;
}

export function SitePageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("site-page-description", className)} {...props} />;
}

export function SiteGrid({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"section"> & {
  variant?: "default" | "sidebar" | "detail";
}) {
  return (
    <section
      className={cn(
        "site-grid",
        variant === "sidebar" && "site-grid--sidebar",
        variant === "detail" && "site-grid--detail",
        className
      )}
      {...props}
    />
  );
}

export function SiteRail({ className, ...props }: React.ComponentProps<"aside">) {
  return <aside className={cn("site-rail", className)} {...props} />;
}

export function SitePanel({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"section"> & {
  variant?: "default" | "muted" | "floating" | "highlight";
}) {
  return (
    <section
      className={cn(
        "site-panel",
        variant === "muted" && "site-panel--muted",
        variant === "floating" && "site-panel--floating",
        variant === "highlight" && "site-panel--highlight",
        className
      )}
      {...props}
    />
  );
}

export function SitePanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("site-panel__body", className)} {...props} />;
}
