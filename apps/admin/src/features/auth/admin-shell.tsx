import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { Button, Input, Layout, Space } from "antd";
import { useMemo, useState, type CSSProperties } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import adminLogoUrl from "../../assets/logo.jpg";
import { apiClient } from "../../lib/api-client";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, isAdminNavItemActive } from "./admin-navigation";
import { useAdminAuthStore } from "./auth-store";

const { Header, Sider, Content } = Layout;

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const user = useAdminAuthStore((state) => state.user);
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  const activeGroup = useMemo(
    () =>
      ADMIN_NAV_GROUPS.find((group) =>
        group.items.some((item) => isAdminNavItemActive(location.pathname, item))
      )?.group ?? "数据总览",
    [location.pathname]
  );
  const activeLabel = useMemo(
    () =>
      ADMIN_NAV_ITEMS.find((item) => isAdminNavItemActive(location.pathname, item))?.label ??
      activeGroup,
    [activeGroup, location.pathname]
  );

  return (
    <Layout
      className="admin-shell"
      style={
        {
          ["--admin-header-height" as string]: "92px",
          ["--admin-sider-width" as string]: collapsed ? "92px" : "312px"
        } as CSSProperties
      }
    >
      <Header className="admin-shell__header">
        <div className="admin-shell__brand-row">
          <div className="admin-shell__brand">
            <img alt={`${APP_NAME} 绠＄悊鍚庡彴`} className="admin-shell__brand-logo" src={adminLogoUrl} />
            <div className="admin-shell__brand-copy">
              <div className="admin-shell__brand-kicker">{activeGroup}</div>
              <div className="admin-shell__brand-title">{activeLabel}</div>
            </div>
          </div>

          <Button
            className="admin-shell__collapse-toggle"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => {
              setCollapsed((value) => !value);
            }}
            type="text"
          />

          <div className="admin-shell__search">
            <Input
              allowClear
              placeholder="搜索页面、指标、发布入口或待审核内容..."
              prefix={<SearchOutlined />}
            />
          </div>

          <Space className="admin-shell__header-actions" size="middle">
            <div className="admin-shell__session-meta">
              <div className="admin-shell__session-label">当前管理员</div>
              <div className="admin-shell__session-value">{user?.displayName ?? "系统管理员"}</div>
            </div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                void apiClient
                  .logoutAdmin()
                  .then(() => {
                    setAnonymous();
                    void navigate(APP_ROUTES.adminLogin, { replace: true });
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "退出登录失败");
                  });
              }}
            >
              退出登录
            </Button>
          </Space>
        </div>
      </Header>

      <Layout className="admin-shell__layout">
        <Sider
          className="admin-shell__sider"
          collapsed={collapsed}
          collapsedWidth={92}
          theme="light"
          trigger={null}
          width={312}
        >
          <div className="admin-shell__nav">
            {ADMIN_NAV_GROUPS.map((group) => (
              <section className="admin-shell__nav-group" key={group.group}>
                <div className="admin-shell__nav-group-title">
                  {collapsed ? group.group.slice(0, 1) : group.group}
                </div>
                <div className="admin-shell__nav-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isAdminNavItemActive(location.pathname, item);

                    return (
                      <NavLink
                        className={`admin-shell__nav-item${isActive ? " is-active" : ""}`}
                        end={item.end}
                        key={item.to}
                        to={item.to}
                      >
                        <div className="admin-shell__nav-item-icon">
                          <Icon />
                        </div>
                        {collapsed ? null : (
                          <div className="admin-shell__nav-item-copy">
                            <div className="admin-shell__nav-item-label">{item.label}</div>
                            <div className="admin-shell__nav-item-hint">{item.hint}</div>
                          </div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </Sider>

        <Content className="admin-shell__content">
          <div className="admin-shell__content-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
