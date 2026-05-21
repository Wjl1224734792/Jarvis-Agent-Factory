import { useQuery } from "@tanstack/react-query";
import { Button, Select, Space, Table, Tag, message } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-circle-comments", status, page],
    queryFn: () => apiClient.listAdminCircleComments({ status: status || undefined, page, limit: 20 }),
  });

  const items = useMemo(() => (data?.items ?? []) as Record<string, unknown>[], [data]);

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
