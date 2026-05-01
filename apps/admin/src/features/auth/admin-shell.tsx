import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ScheduleOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { Badge, Button, Input, Layout, Menu, Space, type MenuProps } from "antd";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { logoUrl } from "../../lib/logo-url";
import { ADMIN_AUTH_INVALID_EVENT } from "../../lib/auth-events";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import {
  adminMessagesQueryKey,
  adminModerationTodosQueryKey
} from "../messages/admin-message-navigation";
import {
  ADMIN_NAV_GROUPS,
  getAdminNavGroupKey,
  getAdminNavigationState
} from "./admin-navigation";
import { useAdminAuthStore } from "./auth-store";

const { Header, Sider, Content } = Layout;

export function AdminShell() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const user = useAdminAuthStore((state) => state.user);
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  useEffect(() => {
    function handleAuthInvalid() {
      queryClient.clear();
      setAnonymous();
    }

    window.addEventListener(ADMIN_AUTH_INVALID_EVENT, handleAuthInvalid);
    return () => {
      window.removeEventListener(ADMIN_AUTH_INVALID_EVENT, handleAuthInvalid);
    };
  }, [queryClient, setAnonymous]);

  useEffect(() => {
    const currentQuery =
      location.pathname === ADMIN_ROUTE_PATHS.search
        ? new URLSearchParams(location.search).get("q") ?? ""
        : "";
    setSearchValue(currentQuery);
  }, [location.pathname, location.search]);

  const messagesSummaryQuery = useQuery({
    queryKey: adminMessagesQueryKey({
      readStatus: "unread",
      limit: 1
    }),
    queryFn: () =>
      apiClient.listAdminMessages({
        readStatus: "unread",
        limit: 1
      })
  });
  const todosSummaryQuery = useQuery({
    queryKey: adminModerationTodosQueryKey(),
    queryFn: () => apiClient.listAdminModerationTodos()
  });

  const navigationState = useMemo(
    () => getAdminNavigationState(location.pathname),
    [location.pathname]
  );
  const activeGroup = navigationState.activeItem.group;
  const activeLabel = navigationState.activeItem.label;
  const allGroupKeys = useMemo(
    () => ADMIN_NAV_GROUPS.map((group) => getAdminNavGroupKey(group.group)),
    []
  );
  const menuItems = useMemo<MenuProps["items"]>(
    () =>
      ADMIN_NAV_GROUPS.map((group) => ({
        key: getAdminNavGroupKey(group.group),
        label: group.group,
        children: group.items.map((item) => {
          const Icon = item.icon;

          return {
            key: item.to,
            icon: <Icon />,
            title: item.label,
            label: (
              <div className="admin-shell__menu-item-copy">
                <span className="admin-shell__menu-item-label">{item.label}</span>
                {!collapsed ? (
                  <span className="admin-shell__menu-item-hint">{item.hint}</span>
                ) : null}
              </div>
            )
          };
        })
      })),
    [collapsed]
  );

  function submitSearch(value: string) {
    const trimmed = value.trim();
    const search = trimmed.length > 0 ? `?q=${encodeURIComponent(trimmed)}` : "";
    void navigate({
      pathname: ADMIN_ROUTE_PATHS.search,
      search
    });
  }

  return (
    <Layout
      className="admin-shell"
      hasSider
      style={
        {
          ["--admin-header-height" as string]: "84px",
          ["--admin-sider-width" as string]: collapsed ? "88px" : "288px"
        } as CSSProperties
      }
    >
      <Header className="admin-shell__header">
        <div className="admin-shell__header-inner">
          <div className="admin-shell__brand">
            <img alt={`${APP_NAME} 管理后台`} className="admin-shell__brand-logo" src={logoUrl} />
            <div className="admin-shell__brand-main">
              <div className="admin-shell__brand-kicker">{APP_NAME}</div>
              <div className="admin-shell__brand-title">传统管理后台</div>
              <div className="admin-shell__brand-subtitle">
                {activeGroup} / {activeLabel}
              </div>
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
            <Input.Search
              allowClear
              onChange={(event) => {
                setSearchValue(event.target.value);
              }}
              onSearch={submitSearch}
              placeholder="搜索页面、审核入口或运营模块"
              prefix={<SearchOutlined />}
              value={searchValue}
            />
          </div>

          <div className="admin-shell__future-slots" aria-label="reserved-entry-slots">
            <Link className="admin-shell__future-slot admin-shell__future-slot--link" to={ADMIN_ROUTE_PATHS.messages}>
              <Badge count={messagesSummaryQuery.data?.unreadCount ?? 0} overflowCount={99} size="small">
                <BellOutlined />
              </Badge>
              <div className="admin-shell__future-slot-copy">
                <span className="admin-shell__future-slot-label">消息中心</span>
                <span className="admin-shell__future-slot-meta">
                  {messagesSummaryQuery.data?.unreadCount ?? 0} 条未读
                </span>
              </div>
            </Link>
            <Link className="admin-shell__future-slot admin-shell__future-slot--link" to={ADMIN_ROUTE_PATHS.messageTodos}>
              <Badge count={todosSummaryQuery.data?.pendingCount ?? 0} overflowCount={99} size="small">
                <ScheduleOutlined />
              </Badge>
              <div className="admin-shell__future-slot-copy">
                <span className="admin-shell__future-slot-label">待办</span>
                <span className="admin-shell__future-slot-meta">
                  {todosSummaryQuery.data?.pendingCount ?? 0} 项待处理
                </span>
              </div>
            </Link>
          </div>

          <Space className="admin-shell__header-actions" size="middle">
            <div className="admin-shell__session-meta">
              <div className="admin-shell__session-label">当前管理员</div>
              <div className="admin-shell__session-value">
                {user?.displayName ?? "系统管理员"}
              </div>
            </div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                void apiClient
                  .logoutAdmin()
                  .then(() => {
                    queryClient.clear();
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

      <Layout className="admin-shell__layout" hasSider>
        <Sider
          breakpoint="lg"
          className="admin-shell__sider"
          collapsed={collapsed}
          collapsedWidth={88}
          onBreakpoint={(broken) => {
            setCollapsed(broken);
          }}
          theme="light"
          trigger={null}
          width={288}
        >
          <div className="admin-shell__sider-inner">
            <div className="admin-shell__sider-top">
              {collapsed ? null : (
                <>
                  <div className="admin-shell__sider-title">业务导航</div>
                  <div className="admin-shell__sider-caption">
                    消息、待办、审核、运营和管理入口统一在这一层收口，后续联动优先复用现有审核页路由和筛选协议。
                  </div>
                </>
              )}
            </div>
            <Menu
              className="admin-shell__menu"
              inlineCollapsed={collapsed}
              items={menuItems}
              mode="inline"
              onClick={({ key }) => {
                void navigate(String(key));
              }}
              openKeys={collapsed ? [] : allGroupKeys}
              selectedKeys={navigationState.selectedKeys}
            />
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
