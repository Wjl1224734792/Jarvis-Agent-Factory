import { useQuery } from "@tanstack/react-query";
import { Button, Select, Space, Table, Tag, message } from "antd";
import { useMemo, useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  buildModerationTraceItems,
  MODERATION_TRACE_PLACEHOLDER
} from "../../lib/moderation-tracking";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

const statusOptions = [
  { label: "全部", value: "" },
  { label: "可见", value: "visible" },
  { label: "已隐藏", value: "hidden" },
] as const;

const statusColors: Record<string, string> = {
  visible: "green",
  hidden: "orange",
};

const statusLabels: Record<string, string> = {
  visible: "可见",
  hidden: "已隐藏",
};

export function CircleCommentsAdminPage() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-circle-comments", status, page],
    queryFn: () => apiClient.listAdminCircleComments({ status: status || undefined, page, limit: 20 }),
  });

  const siteSettingsQuery = useQuery({
    queryKey: ["admin-circle-comments", "site-settings"],
    queryFn: () => apiClient.getSiteSettings(),
  });

  const items = useMemo(() => (data?.items ?? []) as Record<string, unknown>[], [data]);

  const traceItems = useMemo(
    () =>
      buildModerationTraceItems([
        {
          label: "可见",
          count: items.filter((item) => item.status === "visible").length,
          tone: "success",
          hideWhenZero: true
        },
        {
          label: "已隐藏",
          count: items.filter((item) => item.status === "hidden").length,
          hideWhenZero: true
        }
      ]),
    [items]
  );

  const moderationMode = siteSettingsQuery.data?.item.moderationModes.circleComment ?? "ai";

  async function handleModerationModeChange(mode: "manual" | "ai" | "automatic") {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      if (!current) return;

      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(current, { moderationModes: { circleComment: mode } })
      );
      await siteSettingsQuery.refetch();
      message.success("审核模式已更新");
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新审核模式失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const columns = [
    {
      title: "内容", dataIndex: "content", key: "content", ellipsis: true, width: 300,
      render: (v: string) => (v?.length > 100 ? v.slice(0, 100) + "..." : v) ?? "",
    },
    {
      title: "作者", key: "author", width: 100,
      render: (_: unknown, r: Record<string, unknown>) => (r.author as Record<string, unknown>)?.displayName as string ?? "-",
    },
    {
      title: "所属帖子", dataIndex: "postTitle", key: "postTitle", ellipsis: true, width: 150,
    },
    {
      title: "状态", dataIndex: "status", key: "status", width: 80,
      render: (s: string) => <Tag color={statusColors[s] ?? "default"}>{statusLabels[s] ?? s}</Tag>,
    },
    { title: "举报", dataIndex: "reportCount", key: "reportCount", width: 60 },
    { title: "点赞", dataIndex: "likeCount", key: "likeCount", width: 60 },
    {
      title: "发布时间", dataIndex: "createdAt", key: "createdAt", width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-",
    },
    {
      title: "操作", key: "actions", width: 160,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          {r.status === "visible" && (
            <Button size="small" onClick={() => void handleStatusChange(r.id as string, "hidden")}>隐藏</Button>
          )}
          {r.status === "hidden" && (
            <Button size="small" onClick={() => void handleStatusChange(r.id as string, "visible")}>恢复</Button>
          )}
        </Space>
      ),
    },
  ];

  async function handleStatusChange(commentId: string, newStatus: string) {
    try {
      await apiClient.updateAdminCircleCommentStatus(commentId, { status: newStatus });
      message.success("状态更新成功");
      void refetch();
    } catch {
      message.error("操作失败");
    }
  }

  return (
    <AdminPage title="圈子评论审核">
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel
        description="切换圈子评论的审核模式：AI 审核会自动检测违规内容，人工审核则全部进入待处理队列。"
        title="当前模式"
      >
        <AdminModerationCard
          aiCopy="新圈子评论会先进入 AI 审核；仍需人工处理的对象会留在当前队列。"
          description="当前页只展示评论列表和状态流转，不额外伪造 AI 明细。"
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy={"新圈子评论会直接进入人工审核队列，不再按“自动通过”理解。"}
          mode={moderationMode}
          onModeChange={handleModerationModeChange}
          pendingCount={items.filter((item) => item.status === "hidden").length}
          queueLabel="已隐藏"
          traceHint={MODERATION_TRACE_PLACEHOLDER}
          traceItems={traceItems}
          title="圈子评论审核"
        />
      </AdminPanel>

      <AdminPanel>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={statusOptions.map(o => ({ label: o.label, value: o.value }))}
            style={{ width: 120 }}
          />
          <Button onClick={() => refetch()}>刷新</Button>
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, onChange: setPage, total: items.length >= 20 ? (page + 1) * 20 : page * 20, showSizeChanger: false }}
          scroll={{ x: 900 }}
        />
      </AdminPanel>
    </AdminPage>
  );
}
