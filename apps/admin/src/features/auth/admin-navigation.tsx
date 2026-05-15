import { APP_ROUTES } from "@feijia/shared";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BuildOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GatewayOutlined,
  InboxOutlined,
  MailOutlined,
  NotificationOutlined,
  OrderedListOutlined,
  RadarChartOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { matchPath } from "react-router-dom";
import type { MenuProps } from "antd";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";

export interface AdminNavItem {
  group: "数据总览" | "审核" | "运营" | "管理";
  to: string;
  label: string;
  hint: string;
  icon: typeof RadarChartOutlined;
  end: boolean;
}

export type AdminNavGroup = AdminNavItem["group"];

const ADMIN_COMMENT_ROUTE_PATHS = new Set<string>([
  APP_ROUTES.adminReviewComments,
  APP_ROUTES.adminModelComments,
  APP_ROUTES.adminRankingComments,
  APP_ROUTES.adminRatingTargetComments
]);

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    group: "数据总览",
    to: ADMIN_ROUTE_PATHS.overview,
    label: "总览中心",
    hint: "KPI、待办、最近通知和快捷入口",
    icon: RadarChartOutlined,
    end: true
  },
  {
    group: "数据总览",
    to: ADMIN_ROUTE_PATHS.messages,
    label: "消息中心",
    hint: "系统消息、已读状态和消息筛选",
    icon: MailOutlined,
    end: true
  },
  {
    group: "数据总览",
    to: ADMIN_ROUTE_PATHS.messageTodos,
    label: "审核待办",
    hint: "聚合待处理数量，并复用现有审核页落点",
    icon: ScheduleOutlined,
    end: true
  },
  {
    group: "数据总览",
    to: ADMIN_ROUTE_PATHS.logs,
    label: "日志监控",
    hint: "查看服务端日志分类、文件和最近日志行",
    icon: DatabaseOutlined,
    end: false
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
    hint: "品牌申请独立队列与审核入口",
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
    to: ADMIN_ROUTE_PATHS.moderationRatingTargets,
    label: "评分对象审核",
    hint: "评分对象独立队列与状态查看",
    icon: OrderedListOutlined,
    end: false
  },
  {
    group: "审核",
    to: ADMIN_ROUTE_PATHS.moderationFiles,
    label: "文件审核",
    hint: "图片和视频审核记录、人工通过与驳回入口",
    icon: CloudUploadOutlined,
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
    to: ADMIN_ROUTE_PATHS.operationsBrands,
    label: "创建品牌",
    hint: "品牌新建与 Logo 上传工作台",
    icon: AppstoreOutlined,
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
    to: ADMIN_ROUTE_PATHS.managementOfficialArticles,
    label: "官方文章库",
    hint: "官方文章历史维护、编辑入口与删除操作",
    icon: ReadOutlined,
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
    to: ADMIN_ROUTE_PATHS.managementPowerTypes,
    label: "动力分类",
    hint: "飞行器动力类型配置",
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
    to: ADMIN_ROUTE_PATHS.managementUsers,
    label: "用户管理",
    hint: "搜索用户资料，查看详情，并处理封禁或解封操作",
    icon: UserOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.managementSecurity,
    label: "安全设置",
    hint: "修改管理员密码与后台账号安全配置",
    icon: SafetyCertificateOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.managementRoles,
    label: "角色管理",
    hint: "查看和编辑系统角色权限配置",
    icon: TeamOutlined,
    end: false
  },
  {
    group: "管理",
    to: ADMIN_ROUTE_PATHS.aiSettings,
    label: "AI 设置",
    hint: "AI 服务商配置、模型选择和功能开关",
    icon: RobotOutlined,
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
    map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return map;
  }, new Map<AdminNavGroup, AdminNavItem[]>())
).map(([group, items]) => ({
  group,
  items
}));

/**
 * 生成后台导航分组的稳定 key。
 * @param group 导航分组名称。
 * @returns 可用于菜单组件的分组 key。
 * @throws 本函数不主动抛出异常。
 */
export function getAdminNavGroupKey(group: AdminNavGroup) {
  return `group:${group}`;
}

/**
 * 判断导航项是否与当前路径匹配。
 * @param pathname 当前路由路径。
 * @param item 待判断的导航项。
 * @returns 命中路由匹配时返回 `true`。
 * @throws 本函数不主动抛出异常。
 */
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
  if (pathname.startsWith(ADMIN_ROUTE_PATHS.messages)) {
    return pathname.startsWith(ADMIN_ROUTE_PATHS.messageTodos)
      ? ADMIN_ROUTE_PATHS.messageTodos
      : ADMIN_ROUTE_PATHS.messages;
  }
  if (pathname.startsWith(ADMIN_ROUTE_PATHS.logs)) {
    return ADMIN_ROUTE_PATHS.logs;
  }
  if (pathname === APP_ROUTES.adminPosts) {
    return ADMIN_ROUTE_PATHS.moderationArticles;
  }
  if (pathname === APP_ROUTES.adminPostComments) {
    return ADMIN_ROUTE_PATHS.moderationComments;
  }
  if (ADMIN_COMMENT_ROUTE_PATHS.has(pathname)) {
    return ADMIN_ROUTE_PATHS.moderationComments;
  }
  if (pathname === APP_ROUTES.adminBrandApplications) {
    return ADMIN_ROUTE_PATHS.moderationBrandApplications;
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
  if (pathname === ADMIN_ROUTE_PATHS.managementPowerTypes) {
    return ADMIN_ROUTE_PATHS.managementPowerTypes;
  }
  if (pathname === APP_ROUTES.adminContentCategories) {
    return ADMIN_ROUTE_PATHS.managementContentCategories;
  }
  if (pathname === ADMIN_ROUTE_PATHS.managementSecurity) {
    return ADMIN_ROUTE_PATHS.managementSecurity;
  }
  if (pathname === ADMIN_ROUTE_PATHS.aiSettings) {
    return ADMIN_ROUTE_PATHS.aiSettings;
  }
  if (pathname === ADMIN_ROUTE_PATHS.managementUsers) {
    return ADMIN_ROUTE_PATHS.managementUsers;
  }
  if (pathname === ADMIN_ROUTE_PATHS.managementRoles) {
    return ADMIN_ROUTE_PATHS.managementRoles;
  }
  if (pathname === ADMIN_ROUTE_PATHS.officialArticles) {
    return ADMIN_ROUTE_PATHS.managementOfficialArticles;
  }
  if (pathname === APP_ROUTES.adminReviews) {
    return APP_ROUTES.adminReviews;
  }
  if (pathname.startsWith(`${APP_ROUTES.adminRankings}/new`)) {
    return ADMIN_ROUTE_PATHS.operationsRankings;
  }
  if (pathname.startsWith(ADMIN_ROUTE_PATHS.moderationRatingTargets)) {
    return ADMIN_ROUTE_PATHS.moderationRatingTargets;
  }
  if (pathname.startsWith(APP_ROUTES.adminRankings)) {
    return ADMIN_ROUTE_PATHS.moderationRankings;
  }

  return pathname;
}

/**
 * 计算当前路径对应的激活导航项路径集合。
 * @param pathname 当前路由路径。
 * @returns 命中的导航项 `to` 路径列表。
 * @throws 本函数不主动抛出异常。
 */
export function getActiveAdminNavItemPaths(pathname: string) {
  const normalizedPathname = normalizeAdminPath(pathname);
  return ADMIN_NAV_ITEMS.filter((item) => isAdminNavItemActive(normalizedPathname, item)).map(
    (item) => item.to
  );
}

/**
 * 生成后台导航选中态和展开态。
 * @param pathname 当前路由路径。
 * @returns 标准化路径、当前激活项以及菜单选中状态。
 * @throws 本函数不主动抛出异常。
 */
export function getAdminNavigationState(pathname: string) {
  const normalizedPathname = normalizeAdminPath(pathname);
  const activeItem =
    ADMIN_NAV_ITEMS.find((item) => isAdminNavItemActive(normalizedPathname, item)) ??
    ADMIN_NAV_ITEMS[0];

  return {
    normalizedPathname,
    activeItem,
    selectedKeys: [activeItem.to],
    openKeys: [getAdminNavGroupKey(activeItem.group)]
  };
}

// ---------- antd Menu items 格式（SubMenu 分组） ----------

/** 角色列表类型，与 authRoleSchema 对齐。 */
export type AdminRole = "super_admin" | "admin" | "editor" | "moderator" | "operator";

/**
 * 后台侧边栏菜单数据，直接兼容 antd Menu 的 items prop。
 * 5 个分组，每组包含 children 子菜单项。
 * 每个分组和子菜单项均标注 roles 字段，标明哪些角色可见。
 */
export const ADMIN_MENU_ITEMS: MenuProps["items"] = [
  {
    key: "group:overview",
    label: "数据总览",
    icon: <RadarChartOutlined />,
    roles: ["super_admin", "admin", "editor", "moderator", "operator"],
    children: [
      { key: ADMIN_ROUTE_PATHS.overview, icon: <RadarChartOutlined />, label: "总览中心", roles: ["super_admin", "admin", "editor", "moderator", "operator"] },
      { key: ADMIN_ROUTE_PATHS.messages, icon: <MailOutlined />, label: "消息中心", roles: ["super_admin", "admin", "editor", "moderator", "operator"] },
      { key: ADMIN_ROUTE_PATHS.logs, icon: <DatabaseOutlined />, label: "日志监控", roles: ["super_admin", "admin"] }
    ]
  },
  {
    key: "group:content",
    label: "内容管理",
    icon: <ReadOutlined />,
    roles: ["super_admin", "admin", "editor"],
    children: [
      { key: ADMIN_ROUTE_PATHS.managementOfficialArticles, icon: <ReadOutlined />, label: "官方文章库", roles: ["super_admin", "admin", "editor"] },
      { key: ADMIN_ROUTE_PATHS.managementBrands, icon: <AppstoreOutlined />, label: "品牌库", roles: ["super_admin", "admin", "editor"] },
      { key: ADMIN_ROUTE_PATHS.managementModels, icon: <BuildOutlined />, label: "机型库", roles: ["super_admin", "admin", "editor"] },
      { key: ADMIN_ROUTE_PATHS.managementCategories, icon: <ApartmentOutlined />, label: "机型分类", roles: ["super_admin", "admin", "editor"] },
      { key: ADMIN_ROUTE_PATHS.managementPowerTypes, icon: <ApartmentOutlined />, label: "动力分类", roles: ["super_admin", "admin", "editor"] },
      { key: ADMIN_ROUTE_PATHS.managementContentCategories, icon: <ClusterOutlined />, label: "内容分类", roles: ["super_admin", "admin", "editor"] },
      { key: APP_ROUTES.adminReviews, icon: <FileSearchOutlined />, label: "评测档案", roles: ["super_admin", "admin", "editor"] }
    ]
  },
  {
    key: "group:moderation",
    label: "审核管理",
    icon: <SafetyOutlined />,
    roles: ["super_admin", "admin", "moderator"],
    children: [
      { key: ADMIN_ROUTE_PATHS.messageTodos, icon: <ScheduleOutlined />, label: "审核待办", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationArticles, icon: <FlagOutlined />, label: "文章审核", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationMoments, icon: <NotificationOutlined />, label: "飞友圈动态", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationComments, icon: <CommentOutlined />, label: "评论审核", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationReports, icon: <FileSearchOutlined />, label: "举报内容", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationBrandApplications, icon: <InboxOutlined />, label: "品牌申请", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions, icon: <CloudUploadOutlined />, label: "机型投稿", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationRankings, icon: <OrderedListOutlined />, label: "榜单审核", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationRatingTargets, icon: <OrderedListOutlined />, label: "评分对象审核", roles: ["super_admin", "admin", "moderator"] },
      { key: ADMIN_ROUTE_PATHS.moderationFiles, icon: <CloudUploadOutlined />, label: "文件审核", roles: ["super_admin", "admin", "moderator"] }
    ]
  },
  {
    key: "group:operations",
    label: "运营工具",
    icon: <ToolOutlined />,
    roles: ["super_admin", "admin", "operator"],
    children: [
      { key: ADMIN_ROUTE_PATHS.operationsArticles, icon: <ReadOutlined />, label: "创建文章", roles: ["super_admin", "admin", "operator"] },
      { key: ADMIN_ROUTE_PATHS.operationsAircraft, icon: <GatewayOutlined />, label: "创建飞行器", roles: ["super_admin", "admin", "operator"] },
      { key: ADMIN_ROUTE_PATHS.operationsBrands, icon: <AppstoreOutlined />, label: "创建品牌", roles: ["super_admin", "admin", "operator"] },
      { key: ADMIN_ROUTE_PATHS.operationsRankings, icon: <TrophyOutlined />, label: "创建榜单", roles: ["super_admin", "admin", "operator"] }
    ]
  },
  {
    key: "group:settings",
    label: "系统设置",
    icon: <SettingOutlined />,
    roles: ["super_admin", "admin", "editor", "moderator", "operator"],
    children: [
      { key: ADMIN_ROUTE_PATHS.managementUsers, icon: <UserOutlined />, label: "用户管理", roles: ["super_admin", "admin"] },
      { key: ADMIN_ROUTE_PATHS.managementRoles, icon: <TeamOutlined />, label: "角色管理", roles: ["super_admin", "admin"] },
      { key: ADMIN_ROUTE_PATHS.managementSecurity, icon: <SafetyCertificateOutlined />, label: "安全设置", roles: ["super_admin", "admin", "editor", "moderator", "operator"] },
      { key: ADMIN_ROUTE_PATHS.aiSettings, icon: <RobotOutlined />, label: "AI 设置", roles: ["super_admin", "admin"] }
    ]
  }
] as unknown as MenuProps["items"];

/**
 * 根据当前路由路径计算 antd Menu 所需的 selectedKey 和 openKeys。
 * @param pathname 当前路由路径。
 * @returns selectedKey（激活菜单项 key）和 openKeys（展开分组 key 列表）。
 * @throws 本函数不主动抛出异常。
 */
export function getActiveKeys(
  pathname: string
): { selectedKey: string; openKeys: string[] } {
  const normalizedPathname = normalizeAdminPath(pathname);

  for (const group of ADMIN_MENU_ITEMS ?? []) {
    if (!group || !("children" in group) || !group.children) continue;
    for (const child of group.children) {
      if (!child || !("key" in child)) continue;
      if (child.key === normalizedPathname) {
        return {
          selectedKey: normalizedPathname,
          openKeys: [String(group.key)]
        };
      }
    }
  }

  return { selectedKey: normalizedPathname, openKeys: [] };
}
