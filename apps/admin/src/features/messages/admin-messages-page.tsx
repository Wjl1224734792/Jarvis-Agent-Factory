import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Empty,
  Select,
  Segmented,
  Space,
  Statistic,
  Table
} from "antd";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminPage } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import {
  adminMessagesQueryKey,
  adminMessageDomainOptions,
  adminMessageReadStatusOptions,
  adminMessageTypeOptions,
  adminModerationTodosQueryKey,
  getAdminMessageDomainLabel,
  getAdminMessageTypeLabel,
  invalidateAdminMessageQueries,
  resolveAdminMessageDestination
} from "./admin-message-navigation";

type AdminMessageRecord = Awaited<ReturnType<typeof apiClient.listAdminMessages>>["items"][number];

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

export function AdminMessagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionError, setActionError] = useState<string | null>(null);
  const domain = searchParams.get("domain");
  const type = searchParams.get("type");
  const readStatus = searchParams.get("readStatus");

  const activeDomain = adminMessageDomainOptions.some((item) => item.value === domain)
    ? (domain as (typeof adminMessageDomainOptions)[number]["value"])
    : undefined;
  const activeType = adminMessageTypeOptions.some((item) => item.value === type)
    ? (type as (typeof adminMessageTypeOptions)[number]["value"])
    : undefined;
  const activeReadStatus = adminMessageReadStatusOptions.some((item) => item.value === readStatus)
    ? (readStatus as (typeof adminMessageReadStatusOptions)[number]["value"])
    : "all";

  const messagesQuery = useQuery({
    queryKey: adminMessagesQueryKey({
      domain: activeDomain,
      type: activeType,
      readStatus: activeReadStatus,
      limit: 50
    }),
    queryFn: () =>
      apiClient.listAdminMessages({
        domain: activeDomain,
        type: activeType,
        readStatus: activeReadStatus,
        limit: 50
      })
  });
  const todosQuery = useQuery({
    queryKey: adminModerationTodosQueryKey(),
    queryFn: () => apiClient.listAdminModerationTodos()
  });

  const filteredMessageTypes = useMemo(() => {
    if (!activeDomain) {
      return adminMessageTypeOptions;
    }

    return adminMessageTypeOptions.filter((item) => {
      switch (activeDomain) {
        case "posts":
          return item.value === "post_audit_result";
        case "reviews":
          return item.value === "review_audit_result";
        case "rankings":
          return item.value === "ranking_audit_result";
        case "rating_targets":
          return item.value === "rating_target_audit_result";
        case "aircraft_submissions":
          return item.value === "aircraft_submission_audit_result";
        case "brand_applications":
          return item.value === "brand_application_audit_result";
        default:
          return false;
      }
    });
  }, [activeDomain]);

  async function markMessageRead(id: string) {
    setActionError(null);
    try {
      await apiClient.markAdminMessageRead(id);
      await invalidateAdminMessageQueries(queryClient);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "标记消息已读失败");
    }
  }

  async function markAllRead() {
    setActionError(null);
    try {
      await apiClient.markAllAdminMessagesRead();
      await invalidateAdminMessageQueries(queryClient);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "批量标记已读失败");
    }
  }

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button
            disabled={(messagesQuery.data?.unreadCount ?? 0) === 0}
            onClick={() => {
              void markAllRead();
            }}
          >
            全部标记已读
          </Button>
          <Button href={ADMIN_ROUTE_PATHS.messageTodos}>查看审核待办</Button>
        </Space>
      }
      description="直接消费后端 admin messages / todos 契约，支持筛选、单条已读、批量已读和跳转到现有审核页。"
      title="消息中心"
    >
      <Breadcrumb
        items={[
          { title: "后台" },
          { title: "数据总览" },
          { title: "消息中心" }
        ]}
      />

      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <div className="admin-message-stat-grid">
        <Card className="admin-overview-card" size="small" variant="outlined">
          <Statistic
            loading={messagesQuery.isLoading}
            title="未读消息"
            value={messagesQuery.data?.unreadCount ?? 0}
          />
        </Card>
        <Card className="admin-overview-card" size="small" variant="outlined">
          <Statistic
            loading={todosQuery.isLoading}
            title="待处理总数"
            value={todosQuery.data?.pendingCount ?? 0}
          />
        </Card>
        <Card className="admin-overview-card" size="small" variant="outlined">
          <Statistic
            loading={messagesQuery.isLoading}
            title="当前筛选结果"
            value={messagesQuery.data?.items.length ?? 0}
          />
        </Card>
      </div>

      <Card className="admin-overview-card" size="small" title="筛选条件" variant="outlined">
        <div className="admin-message-filter-row">
          <Segmented
            block
            onChange={(value) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (value === "all") {
                  next.delete("readStatus");
                } else {
                  next.set("readStatus", String(value));
                }
                return next;
              });
            }}
            options={[...adminMessageReadStatusOptions]}
            value={activeReadStatus}
          />
          <Select
            allowClear
            onChange={(value) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.delete("type");
                if (!value) {
                  next.delete("domain");
                } else {
                  next.set("domain", String(value));
                }
                return next;
              });
            }}
            options={adminMessageDomainOptions}
            placeholder="筛选业务域"
            style={{ width: 220 }}
            value={activeDomain}
          />
          <Select
            allowClear
            onChange={(value) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (!value) {
                  next.delete("type");
                } else {
                  next.set("type", String(value));
                }
                return next;
              });
            }}
            options={filteredMessageTypes}
            placeholder="筛选消息类型"
            style={{ width: 240 }}
            value={activeType}
          />
        </div>
      </Card>

      <div className="admin-message-page-grid">
        <Card className="admin-overview-card" size="small" title="消息列表" variant="outlined">
          <Table
            bordered
            columns={[
              {
                key: "status",
                render: (_, record: AdminMessageRecord) =>
                  record.isRead ? (
                    <Badge status="default" text="已读" />
                  ) : (
                    <Badge status="processing" text="未读" />
                  ),
                title: "状态",
                width: 96
              },
              {
                key: "content",
                render: (_, record: AdminMessageRecord) => (
                  <div className="admin-table-meta">
                    <div className="admin-table-title">{record.title}</div>
                    <div className="admin-table-subtitle">
                      {record.summary}
                    </div>
                    <div className="admin-message-target-line">
                      {getAdminMessageDomainLabel(record.domain)} / {getAdminMessageTypeLabel(record.type)}
                      {record.target.status ? ` / ${record.target.status}` : ""}
                    </div>
                  </div>
                ),
                title: "消息内容"
              },
              {
                key: "subject",
                render: (_, record: AdminMessageRecord) =>
                  record.subjectUser?.displayName ?? record.target.title,
                title: "关联对象",
                width: 160
              },
              {
                dataIndex: "createdAt",
                key: "createdAt",
                render: (value: string) => formatMessageTime(value),
                title: "时间",
                width: 172
              },
              {
                key: "action",
                render: (_, record: AdminMessageRecord) => {
                  const destination = resolveAdminMessageDestination(record.domain, record.navigation);

                  return (
                    <Space size="small" wrap>
                      <Button
                        onClick={() => {
                          void navigate(destination);
                        }}
                        size="small"
                        type="primary"
                      >
                        去处理
                      </Button>
                      {!record.isRead ? (
                        <Button
                          onClick={() => {
                            void markMessageRead(record.id);
                          }}
                          size="small"
                        >
                          标记已读
                        </Button>
                      ) : null}
                    </Space>
                  );
                },
                title: "操作",
                width: 170
              }
            ]}
            dataSource={messagesQuery.data?.items ?? []}
            locale={{
              emptyText: <Empty description="当前筛选下没有消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }}
            loading={messagesQuery.isLoading || messagesQuery.isFetching}
            pagination={false}
            rowClassName={(record) => (record.isRead ? "" : "admin-message-row--unread")}
            rowKey={(record) => record.id}
            size="small"
          />
        </Card>

        <Card
          className="admin-overview-card"
          extra={<Button href={ADMIN_ROUTE_PATHS.messageTodos} type="link">进入待办页</Button>}
          size="small"
          title="待办摘要"
          variant="outlined"
        >
          <div className="admin-message-todo-summary">
            {(todosQuery.data?.items.length ?? 0) > 0 ? (
              todosQuery.data?.items.slice(0, 6).map((item) => {
                const destination = resolveAdminMessageDestination(item.domain, item.navigation);
                return (
                  <Button
                    className="admin-message-todo-summary__item"
                    key={`${item.domain}-${item.title}`}
                    onClick={() => {
                      void navigate(destination);
                    }}
                    type="text"
                  >
                    <span className="admin-message-todo-summary__title">{item.title}</span>
                    <Badge count={item.pendingCount} overflowCount={99} showZero />
                  </Button>
                );
              })
            ) : (
              <Empty description="当前没有待处理项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
