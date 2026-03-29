import { APP_ROUTES } from "@feijia/shared";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BuildOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GatewayOutlined,
  InboxOutlined,
  NotificationOutlined,
  OrderedListOutlined,
  RadarChartOutlined,
  ReadOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { matchPath } from "react-router-dom";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";

export type AdminNavItem = {
  group: "数据总览" | "审核" | "运营" | "管理";
  to: string;
  label: string;
  hint: string;
  icon: typeof RadarChartOutlined;
  end: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    group: "数据总览",
    to: ADMIN_ROUTE_PATHS.overview,
    label: "总览中心",
    hint: "增长、活跃、待处理与近期开启的全局视图",
    icon: RadarChartOutlined,
    end: true
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationArticles,
    label: "文章审核",
    hint: "文章发布队列与人工开关",
    icon: FlagOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationMoments,
    label: "飞友圈动态",
    hint: "动态审核入口，和文章分开处理",
    icon: NotificationOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationComments,
    label: "评论审核",
    hint: "评论、回复与违规内容集中处理",
    icon: CommentOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationReports,
    label: "举报内容",
    hint: "集中查看被举报的内容并快速进入处理页",
    icon: FileSearchOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationBrandApplications,
    label: "品牌申请",
    hint: "品牌申请单独队列与审核入口",
    icon: InboxOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions,
    label: "机型投稿",
    hint: "飞行器资料与机型投稿审核",
    icon: CloudUploadOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationRankings,
    label: "榜单审核",
    hint: "社区榜单的创建与发布状态",
    icon: OrderedListOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationRankingItems,
    label: "条目审核",
    hint: "榜单条目独立队列与条目状态查看",
    icon: OrderedListOutlined,
    end: false
  },
  {
    group: "运营",
    to: ADMIN_ROUTE_PATHS.operationsArticles,
    label: "创建文章",
    hint: "官方文章创建、编辑与发布",
    icon: ReadOutlined,
    end: false
  },
  {
    group: "运营",
    to: ADMIN_ROUTE_PATHS.operationsAircraft,
    label: "创建飞行器",
    hint: "飞行器建档与机型投稿入口",
    icon: GatewayOutlined,
    end: false
  },
  {
    group: "运营",
    to: ADMIN_ROUTE_PATHS.operationsRankings,
    label: "创建榜单",
    hint: "榜单创建、条目编排与运营位管理",
    icon: TrophyOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.managementBrands,
    label: "品牌库",
    hint: "品牌资料维护，不再联动一级分类",
    icon: AppstoreOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.managementModels,
    label: "机型库",
    hint: "机型资料维护与已有品牌搜索选择",
    icon: BuildOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.managementCategories,
    label: "机型分类",
    hint: "机型一级分类维护",
    icon: ApartmentOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.managementContentCategories,
    label: "内容分类",
    hint: "文章与资讯栏目配置",
    icon: ClusterOutlined,
    end: false
  },
  {
    group: "管理",
    to: APP_ROUTES.adminReviews,
    label: "评测档案",
    hint: "评测存量内容管理与兜底入口",
    icon: FileSearchOutlined,
    end: false
  }
];

export const ADMIN_NAV_GROUPS = Array.from(
  ADMIN_NAV_ITEMS.reduce((map, item) => {
    const items = map.get(item.group) ?? [];
    items.push(item);
    map.set(item.group, items);
    return map;
  }, new Map<AdminNavItem["group"], AdminNavItem[]>())
).map(([group, items]) => ({
  group,
  items
}));

export function isAdminNavItemActive(pathname: string, item: AdminNavItem) {
  return Boolean(
    matchPath(
      {
        path: item.to,
        end: item.end
      },
      pathname
    )
  );
}

function normalizeAdminPath(pathname: string) {
  if (pathname === APP_ROUTES.adminHome) {
    return ADMIN_ROUTE_PATHS.overview;
  }
  if (pathname === APP_ROUTES.adminPosts) {
    return ADMIN_ROUTE_PATHS.moderationArticles;
  }
  if (pathname === APP_ROUTES.adminPostComments) {
    return ADMIN_ROUTE_PATHS.moderationComments;
  }
  if (pathname === APP_ROUTES.adminAircraftSubmissions) {
    return ADMIN_ROUTE_PATHS.moderationAircraftSubmissions;
  }
  if (pathname === APP_ROUTES.adminBrands) {
    return ADMIN_ROUTE_PATHS.managementBrands;
  }
  if (pathname === APP_ROUTES.adminModels) {
    return ADMIN_ROUTE_PATHS.managementModels;
  }
  if (pathname === APP_ROUTES.adminCategories) {
    return ADMIN_ROUTE_PATHS.managementCategories;
  }
  if (pathname === APP_ROUTES.adminContentCategories) {
    return ADMIN_ROUTE_PATHS.managementContentCategories;
  }
  if (pathname === APP_ROUTES.adminReviews) {
    return APP_ROUTES.adminReviews;
  }
  if (pathname.startsWith(`${APP_ROUTES.adminRankings}/new`)) {
    return ADMIN_ROUTE_PATHS.operationsRankings;
  }
  if (pathname.startsWith(ADMIN_ROUTE_PATHS.moderationRankingItems)) {
    return ADMIN_ROUTE_PATHS.moderationRankingItems;
  }
  if (pathname.startsWith(APP_ROUTES.adminRankings)) {
    return ADMIN_ROUTE_PATHS.moderationRankings;
  }

  return pathname;
}

export function getActiveAdminNavItemPaths(pathname: string) {
  const normalizedPathname = normalizeAdminPath(pathname);
  return ADMIN_NAV_ITEMS.filter((item) => isAdminNavItemActive(normalizedPathname, item)).map(
    (item) => item.to
  );
}
