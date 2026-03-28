import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  AppstoreOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MessageOutlined,
  RadarChartOutlined,
  StarOutlined,
  TagsOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { Button, Flex, Space } from "antd";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

const navItems = [
  { to: APP_ROUTES.adminHome, label: "概览", hint: "治理总览", icon: RadarChartOutlined },
  { to: APP_ROUTES.adminCategories, label: "分类", hint: "分类资产", icon: TagsOutlined },
  { to: APP_ROUTES.adminBrands, label: "品牌", hint: "品牌索引", icon: AppstoreOutlined },
  { to: APP_ROUTES.adminModels, label: "机型", hint: "机型主数据", icon: AppstoreOutlined },
  { to: APP_ROUTES.adminReviews, label: "点评", hint: "口碑治理", icon: StarOutlined },
  { to: APP_ROUTES.adminRankings, label: "榜单", hint: "官方榜单", icon: TrophyOutlined },
  { to: APP_ROUTES.adminPosts, label: "帖子", hint: "内容审核", icon: FileTextOutlined },
  { to: APP_ROUTES.adminPostComments, label: "评论", hint: "评论治理", icon: MessageOutlined }
] as const;

export function AdminShell() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((state) => state.user);
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <Flex align="center" className="admin-shell__header-inner" justify="space-between" wrap gap={16}>
          <Flex align="center" className="admin-shell__brand" gap={14}>
            <div className="admin-shell__brand-mark">管</div>
            <div>
              <div className="admin-shell__brand-kicker">Feijia Admin</div>
              <div className="admin-shell__brand-title">{APP_NAME} 后台</div>
            </div>
          </Flex>

          <Space size="middle" wrap>
            <div className="admin-muted">当前会话：{user?.displayName ?? "管理员"}</div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                void apiClient
                  .logoutAdmin()
                  .then(() => {
                    setAnonymous();
                    navigate(APP_ROUTES.adminLogin, { replace: true });
                  })
                  .catch((error: unknown) => {
                    setError(error instanceof Error ? error.message : "退出失败");
                  });
              }}
            >
              退出
            </Button>
          </Space>
        </Flex>
      </header>

      <div className="admin-shell__body">
        <aside className="admin-shell__aside">
          <div className="admin-shell__nav">
            <div className="admin-shell__nav-list">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) => `admin-shell__nav-item${isActive ? " is-active" : ""}`}
                    key={item.to}
                    to={item.to}
                  >
                    <Button icon={<Icon />} type="text">
                      <div>
                        <div className="admin-shell__nav-item-label">{item.label}</div>
                        <div className="admin-shell__nav-item-hint">{item.hint}</div>
                      </div>
                    </Button>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="admin-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
