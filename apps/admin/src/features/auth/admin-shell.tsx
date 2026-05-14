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
import { Badge, Button, Input, Layout, Menu, Space } from "antd";
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
  ADMIN_MENU_ITEMS,
  getActiveKeys
} from "./admin-navigation";
import { useAdminAuthStore } from "./auth-store";

const { Header, Sider, Content } = Layout;

/**
 * 根据用户角色过滤菜单项。
 * 有 roles 字段且当前角色不在列表中的项会被隐藏；递归过滤子菜单。
 * @param items antd Menu items 原始数据。
 * @param role 当前用户角色。
 * @returns 过滤后仅保留当前角色可访问的菜单项。
 */
function filterMenuByRole(
  items: typeof ADMIN_MENU_ITEMS,
  role: string
): typeof ADMIN_MENU_ITEMS {
  if (!items) return [];
  return items
    .map(item => {
      if (!item) return null;
      // 如果有 roles 且当前用户角色不在列表中，隐藏
      const rolesItem = item as { roles?: string[] };
      if (Array.isArray(rolesItem.roles) && !rolesItem.roles.includes(role)) {
        return null;
      }
      // 递归过滤子菜单
      if ("children" in item && Array.isArray(item.children)) {
        const filtered = filterMenuByRole(item.children, role);
        if (!filtered || filtered.length === 0) return null;
        return { ...item, children: filtered };
      }
      return item;
    })
    .filter(Boolean);
}

export function AdminShell() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const user = useAdminAuthStore((state) => state.user);
  const userRole = useAdminAuthStore((state) => state.user?.role ?? "admin");
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  /** 根据当前用户角色过滤后的菜单数据。 */
  const filteredMenu = useMemo(
    () => filterMenuByRole(ADMIN_MENU_ITEMS, userRole),
    [userRole]
  );

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

  const { selectedKey, openKeys: activeOpenKeys } = useMemo(
    () => getActiveKeys(location.pathname),
    [location.pathname]
  );

  const [openKeys, setOpenKeys] = useState<string[]>(activeOpenKeys);

  useEffect(() => {
    setOpenKeys(prev => {
      const next = [...prev];
      for (const key of activeOpenKeys) {
        if (!next.includes(key)) next.push(key);
      }
      return next;
    });
  }, [activeOpenKeys]);

  /** 根据 selectedKey 查找所属分组标签和菜单项标签（用于 Header 面包屑）。 */
  const { activeGroup, activeLabel } = useMemo(() => {
    for (const group of filteredMenu ?? []) {
      if (!group || !("children" in group) || !("label" in group) || !group.children) continue;
      for (const child of group.children) {
        if (!child || !("key" in child) || !("label" in child)) continue;
        if (child.key === selectedKey) {
          const groupLabel = typeof group.label === "string" ? group.label : "";
          const childLabel = typeof child.label === "string" ? child.label : "";
          return {
            activeGroup: groupLabel,
            activeLabel: childLabel
          };
        }
      }
    }
    return { activeGroup: "", activeLabel: "" };
  }, [selectedKey, filteredMenu]);

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
              items={filteredMenu}
              mode="inline"
              onClick={({ key }) => {
                void navigate(String(key));
              }}
              onOpenChange={setOpenKeys}
              openKeys={openKeys}
              selectedKeys={[selectedKey]}
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
