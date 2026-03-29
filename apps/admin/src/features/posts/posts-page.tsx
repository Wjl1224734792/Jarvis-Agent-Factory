import { useQuery } from "@tanstack/react-query";
import { Button, Select, Space, Table } from "antd";
import { useMemo, useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已发布", value: "published" },
  { label: "已驳回", value: "rejected" },
  { label: "已隐藏", value: "hidden" }
] as const;

type PostStatusFilter = (typeof statusOptions)[number]["value"];
type PostRecord = Awaited<ReturnType<typeof apiClient.listAdminPosts>>["items"][number];

function postStatusLabel(status: PostRecord["status"]) {
  switch (status) {
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已驳回";
    case "hidden":
      return "已隐藏";
  }
}

export function PostsPage(props: { contentType?: "article" | "moment" } = {}) {
  const [status, setStatus] = useState<PostStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const postsQuery = useQuery({
    queryKey: ["admin-posts", status],
    queryFn: () => apiClient.listAdminPosts(status === "all" ? undefined : status)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-posts", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  const items = useMemo(
    () =>
      (postsQuery.data?.items ?? []).filter((item) =>
        props.contentType ? item.type === props.contentType : true
      ),
    [postsQuery.data?.items, props.contentType]
  );

  const isArticleMode = props.contentType === "article";
  const pageTitle = isArticleMode
    ? "文章审核"
    : props.contentType === "moment"
      ? "飞友圈动态审核"
      : "帖子审核";
  const pageDescription = isArticleMode
    ? "单独处理文章发布队列，和飞友圈动态分开查看。"
    : props.contentType === "moment"
      ? "单独处理飞友圈动态审核，避免和文章队列混在一起。"
      : "按状态审核帖子，控制发布、驳回与隐藏。";

  function updateStatus(id: string, nextStatus: "published" | "rejected" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostStatus(id, {
        status: nextStatus
      })
      .then(() => {
        void postsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新帖子状态失败");
      });
  }

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      await apiClient.updateSiteSettings({
        postModerationEnabled: enabled,
        commentModerationEnabled: current?.commentModerationEnabled ?? true,
        reviewModerationEnabled: current?.reviewModerationEnabled ?? true,
        submissionModerationEnabled: current?.submissionModerationEnabled ?? true
      });
      await Promise.all([siteSettingsQuery.refetch(), postsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新帖子审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Select
          onChange={(value) => {
            setStatus(value);
          }}
          options={statusOptions as unknown as Array<{ label: string; value: string }>}
          style={{ width: 180 }}
          value={status}
        />
      }
      description={pageDescription}
      title={pageTitle}
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="文章和飞友圈动态共用当前帖子审核开关，但入口已经拆分。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新发布内容将直接公开。"
          description="适合高频内容流量场景，减少后台等待队列。"
          enabled={siteSettingsQuery.data?.item.postModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="开启人工审核后，新内容会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={items.filter((item) => item.status === "pending").length}
          title={isArticleMode ? "文章审核" : props.contentType === "moment" ? "动态审核" : "帖子审核"}
        />
      </AdminPanel>

      <AdminPanel title={isArticleMode ? "文章列表" : props.contentType === "moment" ? "动态列表" : "帖子列表"}>
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: PostRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">
                    {record.author.displayName} 路 {record.type === "article" ? "文章" : "动态"} 路 评论 {record.commentCount}
                  </div>
                </div>
              ),
              title: "内容"
            },
            {
              dataIndex: "contentPreview",
              key: "contentPreview",
              title: "摘要"
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: PostRecord["status"]) => postStatusLabel(value),
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: PostRecord) => (
                <Space size="small" wrap>
                  {record.status !== "published" ? (
                    <Button onClick={() => updateStatus(record.id, "published")} size="small" type="primary">
                      通过
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button onClick={() => updateStatus(record.id, "rejected")} size="small">
                      驳回
                    </Button>
                  ) : null}
                  {record.status !== "hidden" ? (
                    <Button danger onClick={() => updateStatus(record.id, "hidden")} size="small">
                      隐藏
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 240
            }
          ]}
          dataSource={items}
          loading={postsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
