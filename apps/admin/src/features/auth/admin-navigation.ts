import { APP_ROUTES } from "@feijia/shared";
import {
  AppstoreOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  RadarChartOutlined,
  ReadOutlined,
  StarOutlined,
  TagsOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { matchPath } from "react-router-dom";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";

export type AdminNavItem = {
  group: string;
  to: string;
  label: string;
  hint: string;
  icon: typeof RadarChartOutlined;
  end: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { group: "总览", to: APP_ROUTES.adminHome, label: "数据总览", hint: "查看实时运营数据与关键趋势", icon: RadarChartOutlined, end: true },
  { group: "内容", to: ADMIN_ROUTE_PATHS.officialArticles, label: "官方文章", hint: "管理官方文章发布与编辑", icon: FlagOutlined, end: false },
  { group: "内容", to: APP_ROUTES.adminContentCategories, label: "内容分类", hint: "维护首页与文章分类体系", icon: TagsOutlined, end: false },
  { group: "内容", to: APP_ROUTES.adminPosts, label: "帖子审核", hint: "审核社区动态与文章内容", icon: FileSearchOutlined, end: false },
  { group: "内容", to: APP_ROUTES.adminPostComments, label: "评论管理", hint: "处理评论状态与违规内容", icon: CommentOutlined, end: false },
  { group: "模型库", to: APP_ROUTES.adminCategories, label: "飞行器分类", hint: "维护飞行器主分类", icon: ReadOutlined, end: false },
  { group: "模型库", to: APP_ROUTES.adminBrands, label: "品牌管理", hint: "维护品牌目录与归属", icon: AppstoreOutlined, end: false },
  { group: "模型库", to: APP_ROUTES.adminModels, label: "机型管理", hint: "维护飞行器机型资料", icon: AppstoreOutlined, end: false },
  { group: "模型库", to: APP_ROUTES.adminReviews, label: "评测管理", hint: "审核机型评测与展示状态", icon: StarOutlined, end: false },
  { group: "运营", to: ADMIN_ROUTE_PATHS.aircraftSubmissions, label: "飞行器投稿", hint: "审核用户投稿的飞行器资料", icon: CloudUploadOutlined, end: false },
  { group: "运营", to: APP_ROUTES.adminRankings, label: "榜单管理", hint: "维护官方榜单与排名内容", icon: TrophyOutlined, end: false }
];

export const ADMIN_NAV_GROUPS = Array.from(
  ADMIN_NAV_ITEMS.reduce((map, item) => {
    const items = map.get(item.group) ?? [];
    items.push(item);
    map.set(item.group, items);
    return map;
  }, new Map<string, AdminNavItem[]>())
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

export function getActiveAdminNavItemPaths(pathname: string) {
  return ADMIN_NAV_ITEMS.filter((item) => isAdminNavItemActive(pathname, item)).map((item) => item.to);
}
