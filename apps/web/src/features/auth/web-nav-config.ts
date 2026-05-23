import { APP_ROUTES } from "@feijia/shared";
import {
  CircleUserRoundIcon,
  MessagesSquareIcon,
  NewspaperIcon,
  PlaneIcon,
  Settings2Icon,
  TrophyIcon
} from "lucide-react";
import { WEB_ROUTE_PATHS } from "@/lib/web-routes";

export const webMainNavItems: readonly {
  to: string;
  label: string;
  icon: typeof NewspaperIcon;
}[] = [
  { to: APP_ROUTES.feedHome, label: "首页", icon: NewspaperIcon },
  { to: APP_ROUTES.flightCircle, label: "飞友圈", icon: MessagesSquareIcon },
  { to: APP_ROUTES.models, label: "机型", icon: PlaneIcon },
  { to: APP_ROUTES.rankings, label: "榜单", icon: TrophyIcon }
] as const;

/** 侧栏「我的」：不含消息（消息在移动端顶栏与通知页） */
export const webSidebarMemberNavItems: readonly {
  to: string;
  label: string;
  icon: typeof NewspaperIcon;
}[] = [
  { to: APP_ROUTES.webSettings, label: "设置", icon: Settings2Icon }
] as const;

export const webBottomNavItems: readonly {
  to: string;
  label: string;
  icon: typeof NewspaperIcon;
}[] = [
  ...webMainNavItems,
  { to: APP_ROUTES.webProfile, label: "我的", icon: CircleUserRoundIcon }
] as const;

export type PublishMenuEntry =
  | { to: string; label: string; action?: never }
  | { to?: never; label: string; action: string };

export const webPublishMenuEntries: readonly PublishMenuEntry[] = [
  { to: WEB_ROUTE_PATHS.publishArticle, label: "发布文章" },
  { action: "create-post", label: "发布动态" },
  { to: WEB_ROUTE_PATHS.publishAircraft, label: "发布机型" },
  { to: APP_ROUTES.publishBrand, label: "申请品牌" },
  { to: APP_ROUTES.rankingEditor, label: "创建榜单" },
  { action: "create-circle", label: "创建圈子" }
] as const;
