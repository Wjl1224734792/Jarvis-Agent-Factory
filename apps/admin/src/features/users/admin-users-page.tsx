import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminBanUserInput, AdminUserDetail, AdminUserListItem } from "@feijia/schemas";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "../auth/auth-store";
import {
  adminUserDetailQueryRootKey,
  buildAdminUserContentCountItems,
  buildAdminUserDetailQueryKey,
  buildAdminUsersQueryKey,
  canUpdateAdminUserStatus,
  formatAdminUserPhone,
  getAdminUserStatusMeta,
  normalizeAdminUserRoleFilter,
  normalizeAdminUserStatusFilter,
  sortAdminUsersWithTargetFirst
} from "./admin-users-page-helpers";

type AdminUsersPageQuery = {
  keyword: string;
  status: "all" | "active" | "banned";
  role: "all" | "user" | "admin";
  page: number;
  pageSize: number;
};

function formatAdminUserTime(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatAdminUserRole(role: AdminUserListItem["role"]) {
  return role === "admin" ? "管理员" : "用户";
}

function renderStatusTag(status: AdminUserListItem["status"]) {
  const meta = getAdminUserStatusMeta(status);
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function buildStatusUpdateDisabledReason(
  currentUserId: string | null | undefined,
  user: Pick<AdminUserListItem, "id" | "role">
) {
  if (user.id === currentUserId) {
    return "不能操作当前登录用户";
  }
  if (user.role === "admin") {
    return "不能操作管理员账号";
  }
  return null;
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAdminAuthStore((state) => state.user);
  const currentUserId = currentUser?.id ?? null;
  const [modal, contextHolder] = Modal.useModal();
  const [query, setQuery] = useState<AdminUsersPageQuery>({
    keyword: "",
    status: "all",
    role: "all",
    page: 1,
    pageSize: 20
  });
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserListItem | null>(null);
  const [banReason, setBanReason] = useState("");
  const [searchText, setSearchText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const usersQuery = useQuery({
    queryKey: buildAdminUsersQueryKey(query),
    queryFn: () => apiClient.listAdminUsers(query)
  });
  const detailQuery = useQuery({
    queryKey: buildAdminUserDetailQueryKey(detailUserId),
    queryFn: () => apiClient.getAdminUser(detailUserId ?? ""),
    enabled: Boolean(detailUserId)
  });

  const users = useMemo(
    () => sortAdminUsersWithTargetFirst(usersQuery.data?.items ?? [], targetUserId),
    [targetUserId, usersQuery.data?.items]
  );
  const detailUser = detailQuery.data?.item;

  async function refreshUsers(nextTargetUserId?: string) {
    if (nextTargetUserId) {
      setTargetUserId(nextTargetUserId);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: adminUserDetailQueryRootKey })
    ]);
  }

  async function submitBan() {
    if (!banTarget) {
      return;
    }

    const reason = banReason.trim();
    if (!reason) {
      setActionError("请输入封禁原因");
      return;
    }

    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const input: AdminBanUserInput = { reason };
      await apiClient.banAdminUser(banTarget.id, input);
      setBanTarget(null);
      setBanReason("");
      await refreshUsers(banTarget.id);
    } catch (reasonValue: unknown) {
      setActionError(reasonValue instanceof Error ? reasonValue.message : "封禁用户失败");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function unbanUser(user: AdminUserListItem) {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      await apiClient.unbanAdminUser(user.id);
      await refreshUsers(user.id);
    } catch (reasonValue: unknown) {
      setActionError(reasonValue instanceof Error ? reasonValue.message : "解封用户失败");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    setQuery((current) => ({
      ...current,
      page: pagination.current ?? current.page,
      pageSize: pagination.pageSize ?? current.pageSize
    }));
  }

  const columns: ColumnsType<AdminUserListItem> = [
    {
      key: "identity",
      render: (_, record) => (
        <div className="admin-table-meta">
          <div className="admin-table-title">{record.displayName}</div>
          <div className="admin-table-subtitle">{record.id}</div>
        </div>
      ),
      title: "用户"
    },
    {
      key: "phone",
      render: (_, record) => record.phoneMasked ?? formatAdminUserPhone(record.phone),
      title: "手机号",
      width: 140
    },
    {
      key: "role",
      render: (_, record) => <Tag color={record.role === "admin" ? "blue" : "default"}>{formatAdminUserRole(record.role)}</Tag>,
      title: "角色",
      width: 110
    },
    {
      key: "status",
      render: (_, record) => renderStatusTag(record.status),
      title: "状态",
      width: 110
    },
    {
      key: "content",
      render: (_, record) => (
        <Space size={4} wrap>
          {buildAdminUserContentCountItems(record.contentCounts)
            .slice(0, 3)
            .map((item) => (
              <Tag key={item.key}>
                {item.label} {item.value}
              </Tag>
            ))}
        </Space>
      ),
      title: "内容",
      width: 220
    },
    {
      dataIndex: "activeSessionCount",
      key: "activeSessionCount",
      title: "活跃会话",
      width: 100
    },
    {
      key: "lastSeenAt",
      render: (_, record) => formatAdminUserTime(record.lastSeenAt),
      title: "最近活跃",
      width: 180
    },
    {
      key: "actions",
      render: (_, record) => {
        const disabledReason = buildStatusUpdateDisabledReason(currentUserId, record);
        const canUpdateStatus = canUpdateAdminUserStatus(currentUserId, record);

        return (
          <Space size="small" wrap>
            <Button
              onClick={() => {
                setDetailUserId(record.id);
              }}
              size="small"
            >
              详情
            </Button>
            {record.status === "banned" ? (
              <Button
                disabled={!canUpdateStatus}
                onClick={() => {
                  void modal.confirm({
                    centered: true,
                    content: disabledReason ?? `确认解封 ${record.displayName}？`,
                    okText: "解封",
                    onOk: () => unbanUser(record),
                    title: "解封用户"
                  });
                }}
                size="small"
                title={disabledReason ?? undefined}
              >
                解封
              </Button>
            ) : (
              <Button
                danger
                disabled={!canUpdateStatus}
                onClick={() => {
                  setBanTarget(record);
                  setBanReason("");
                  setActionError(null);
                }}
                size="small"
                title={disabledReason ?? undefined}
              >
                封禁
              </Button>
            )}
          </Space>
        );
      },
      title: "操作",
      width: 160
    }
  ];

  return (
    <AdminPage title="用户管理">
      {contextHolder}
      {actionError ? <Alert message={actionError} showIcon type="error" /> : null}
      {usersQuery.isError ? (
        <Alert
          description={usersQuery.error instanceof Error ? usersQuery.error.message : "用户列表加载失败"}
          message="用户列表加载失败"
          showIcon
          type="error"
        />
      ) : null}

      <AdminPanel
        actions={
          <Space wrap>
            <Input.Search
              allowClear
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchText(nextValue);
                if (!nextValue) {
                  setQuery((current) => ({
                    ...current,
                    keyword: "",
                    page: 1
                  }));
                }
              }}
              onSearch={(value) => {
                setQuery((current) => ({
                  ...current,
                  keyword: value.trim(),
                  page: 1
                }));
              }}
              placeholder="搜索昵称、手机号或用户 ID"
              style={{ width: 260 }}
              value={searchText}
            />
            <Select
              onChange={(value) => {
                setQuery((current) => ({
                  ...current,
                  status: normalizeAdminUserStatusFilter(value),
                  page: 1
                }));
              }}
              options={[
                { label: "全部状态", value: "all" },
                { label: "正常", value: "active" },
                { label: "已封禁", value: "banned" }
              ]}
              style={{ width: 132 }}
              value={query.status}
            />
            <Select
              onChange={(value) => {
                setQuery((current) => ({
                  ...current,
                  role: normalizeAdminUserRoleFilter(value),
                  page: 1
                }));
              }}
              options={[
                { label: "全部角色", value: "all" },
                { label: "用户", value: "user" },
                { label: "管理员", value: "admin" }
              ]}
              style={{ width: 132 }}
              value={query.role}
            />
            <Button
              onClick={() => {
                void usersQuery.refetch();
              }}
            >
              刷新
            </Button>
          </Space>
        }
        title="用户列表"
      >
        <Table
          bordered
          columns={columns}
          dataSource={users}
          locale={{
            emptyText: <Empty description="当前条件下没有用户" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          }}
          loading={usersQuery.isLoading || usersQuery.isFetching}
          onChange={handleTableChange}
          pagination={{
            current: usersQuery.data?.meta.page ?? query.page,
            pageSize: usersQuery.data?.meta.pageSize ?? query.pageSize,
            total: usersQuery.data?.meta.total ?? 0,
            showSizeChanger: true
          }}
          rowKey={(record) => record.id}
          size="small"
        />
      </AdminPanel>

      <Modal
        centered
        footer={null}
        onCancel={() => {
          setDetailUserId(null);
        }}
        open={Boolean(detailUserId)}
        title="用户详情"
        width={760}
      >
        {detailQuery.isLoading ? <div className="admin-empty">正在加载用户详情...</div> : null}
        {detailQuery.isError ? (
          <Alert
            message={detailQuery.error instanceof Error ? detailQuery.error.message : "用户详情加载失败"}
            showIcon
            type="error"
          />
        ) : null}
        {detailUser ? <AdminUserDetailView user={detailUser} /> : null}
      </Modal>

      <Modal
        centered
        confirmLoading={isUpdatingStatus}
        okText="确认封禁"
        onCancel={() => {
          setBanTarget(null);
          setBanReason("");
        }}
        onOk={() => {
          void submitBan();
        }}
        open={Boolean(banTarget)}
        title="封禁用户"
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            message={banTarget ? `将封禁 ${banTarget.displayName}，请填写可审计的封禁原因。` : ""}
            showIcon
            type="warning"
          />
          {actionError ? <Alert message={actionError} showIcon type="error" /> : null}
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={300}
            onChange={(event) => {
              setBanReason(event.target.value);
            }}
            placeholder="请输入封禁原因"
            showCount
            value={banReason}
          />
        </Space>
      </Modal>
    </AdminPage>
  );
}

function AdminUserDetailView(props: { user: AdminUserDetail }) {
  const { user } = props;
  const contentCountItems = buildAdminUserContentCountItems(user.contentCounts);

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Descriptions
        bordered
        column={2}
        items={[
          { key: "displayName", label: "昵称", children: user.displayName },
          { key: "id", label: "用户 ID", children: user.id },
          { key: "phone", label: "手机号", children: user.phoneMasked ?? formatAdminUserPhone(user.phone) },
          { key: "role", label: "角色", children: formatAdminUserRole(user.role) },
          { key: "status", label: "状态", children: renderStatusTag(user.status) },
          { key: "createdAt", label: "注册时间", children: formatAdminUserTime(user.createdAt) },
          { key: "lastSeenAt", label: "最近活跃", children: formatAdminUserTime(user.lastSeenAt) },
          { key: "banReason", label: "封禁原因", children: user.banReason ?? "暂无" }
        ]}
        size="small"
      />
      <Descriptions
        bordered
        column={3}
        items={contentCountItems.map((item) => ({
          key: item.key,
          label: item.label,
          children: item.value
        }))}
        size="small"
        title="内容统计"
      />
      <Table
        bordered
        columns={[
          { dataIndex: "scope", key: "scope", title: "范围", width: 90 },
          { dataIndex: "status", key: "status", title: "状态", width: 100 },
          { dataIndex: "clientIp", key: "clientIp", render: (value: string | null) => value ?? "未知", title: "IP" },
          {
            key: "lastSeenAt",
            render: (_, record) => formatAdminUserTime(record.lastSeenAt),
            title: "最近活跃",
            width: 180
          }
        ]}
        dataSource={user.recentSessions}
        locale={{
          emptyText: <Empty description="暂无近期会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }}
        pagination={false}
        rowKey={(record) => record.id}
        size="small"
        title={() => "近期会话"}
      />
    </Space>
  );
}
