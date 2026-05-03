import { APP_ROUTES } from "@feijia/shared";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/auth-store";

function buildProfileHref(userId: string, currentUserId?: string | null) {
  if (currentUserId && currentUserId === userId) {
    return APP_ROUTES.webProfile;
  }

  return APP_ROUTES.webUserProfile.replace(":id", userId);
}

export function ProfileLink(props: {
  userId: string;
  children: ReactNode;
  className?: string;
}) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return (
    <Link className={props.className} to={buildProfileHref(props.userId, currentUserId)}>
      {props.children}
    </Link>
  );
}
