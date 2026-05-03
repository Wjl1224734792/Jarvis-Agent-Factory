import { APP_ROUTES } from "@feijia/shared";
import {
  CircleUserRoundIcon,
  HouseIcon,
  MessagesSquareIcon,
  PlaneIcon,
  Settings2Icon,
  TrophyIcon
} from "lucide-react";
import { WEB_ROUTE_PATHS } from "@/lib/web-routes";

export const webMainNavItems: readonly {
  to: string;
  label: string;
  icon: typeof HouseIcon;
}[] = [
  { to: APP_ROUTES.feedHome, label: "首页", icon: HouseIcon },
  { to: APP_ROUTES.flightCircle, label: "飞友圈", icon: MessagesSquareIcon },
  { to: APP_ROUTES.models, label: "飞行器", icon: PlaneIcon },
  { to: APP_ROUTES.rankings, label: "榜单", icon: TrophyIcon }
] as const;

/** 侧栏「我的」：不含消息（消息在移动端顶栏与通知页） */
export const webSidebarMemberNavItems: readonly {
  to: string;
  label: string;
  icon: typeof HouseIcon;
}[] = [
  { to: APP_ROUTES.webSettings, label: "设置", icon: Settings2Icon }
] as const;

export const webBottomNavItems: readonly {
  to: string;
  label: string;
  icon: typeof HouseIcon;
}[] = [
  ...webMainNavItems,
  { to: APP_ROUTES.webProfile, label: "我的", icon: CircleUserRoundIcon }
] as const;

export const webPublishMenuEntries: readonly { to: string; label: string }[] = [
  { to: WEB_ROUTE_PATHS.publishArticle, label: "发布文章" },
  { to: WEB_ROUTE_PATHS.publishMoment, label: "发布动态" },
  { to: WEB_ROUTE_PATHS.publishAircraft, label: "发布飞行器" },
  { to: APP_ROUTES.publishBrand, label: "申请品牌" },
  { to: APP_ROUTES.rankingEditor, label: "创建榜单" }
] as const;
