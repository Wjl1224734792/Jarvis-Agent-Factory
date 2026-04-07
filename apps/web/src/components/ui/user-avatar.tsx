import { UserRoundIcon } from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const fallbackIconSize: Record<"sm" | "default" | "lg", string> = {
  sm: "size-3.5",
  default: "size-4",
  lg: "size-5"
};

export function UserAvatar({
  src,
  displayName,
  className,
  size = "default",
  ...avatarProps
}: Omit<React.ComponentProps<typeof Avatar>, "size"> & {
  src?: string | null;
  displayName: string;
  size?: "sm" | "default" | "lg";
}) {
  const resolved = src?.trim() ? src : undefined;

  return (
    <Avatar className={className} size={size} {...avatarProps}>
      {resolved ? <AvatarImage alt={displayName} src={resolved} /> : null}
      <AvatarFallback>
        <UserRoundIcon
          aria-hidden
          className={cn("text-muted-foreground", fallbackIconSize[size])}
        />
        <span className="sr-only">{displayName}</span>
      </AvatarFallback>
    </Avatar>
  );
}
