import { useQuery } from "@tanstack/react-query";
import { Button, Image, Input, Modal, Select, Space, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const [status, setStatus] = useState<PostStatusFilter>(
    urlStatus === "pending" || urlStatus === "published" || urlStatus === "rejected" || urlStatus === "hidden"
      ? urlStatus
      : "all"
  );
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    setStatus(
      urlStatus === "pending" || urlStatus === "published" || urlStatus === "rejected" || urlStatus === "hidden"
        ? urlStatus
        : "all"
    );
  }, [urlStatus]);

  const postsQuery = useQuery({
    queryKey: ["admin-posts", status],
    queryFn: () => apiClient.listAdminPosts(status === "all" ? undefined : status)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-posts", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-post-detail", detailId],
    queryFn: () => {
      if (!detailId) {
        throw new Error("Missing post id.");
      }
      return apiClient.getPostDetail(detailId);
    },
    enabled: Boolean(detailId)
  });

  const items = useMemo(
    () =>
      (postsQuery.data?.items ?? []).filter((item) =>
        props.contentType ? item.type === props.contentType : true
      ),
    [postsQuery.data?.items, props.contentType]
  );
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.contentPreview, item.author.displayName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [items, searchText]);

  const isArticleMode = props.contentType === "article";
  const pageTitle = isArticleMode
    ? "文章审核"
    : props.contentType === "moment"
      ? "飞友圈动态审核"
      : "内容审核";
  const pageDescription = isArticleMode
    ? "单独处理文章发布队列，并支持在列表中直接查看封面和正文详情。"
    : props.contentType === "moment"
      ? "单独处理飞友圈动态审核，并支持在列表中直接查看封面和正文详情。"
      : "按状态处理文章和动态。";

  function updateStatus(
    id: string,
    nextStatus: "published" | "rejected" | "hidden",
    rejectionReason?: string | null
  ) {
    setError(null);
    void apiClient
      .updateAdminPostStatus(id, {
        status: nextStatus,
        rejectionReason: nextStatus === "rejected" ? rejectionReason ?? null : null
      })
      .then(() => {
        void Promise.all([postsQuery.refetch(), detailQuery.refetch()]);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新内容状态失败");
      });
  }

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      if (!current) {
        return;
      }

      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(
          current,
          isArticleMode
            ? { articleModerationEnabled: enabled }
            : props.contentType === "moment"
              ? { momentModerationEnabled: enabled }
              : {
                  articleModerationEnabled: enabled,
                  momentModerationEnabled: enabled
                }
        )
      );
      await Promise.all([siteSettingsQuery.refetch(), postsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const moderationEnabled = isArticleMode
    ? (siteSettingsQuery.data?.item.articleModerationEnabled ?? true)
    : props.contentType === "moment"
      ? (siteSettingsQuery.data?.item.momentModerationEnabled ?? true)
      : (siteSettingsQuery.data?.item.postModerationEnabled ?? true);

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Input.Search
            allowClear
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder="搜索标题、摘要或作者"
            style={{ width: 240 }}
            value={searchText}
          />
          <Select
            onChange={(value) => {
              setStatus(value);
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (value === "all") {
                  next.delete("status");
                } else {
                  next.set("status", value);
                }
                return next;
              });
            }}
            options={statusOptions as unknown as Array<{ label: string; value: string }>}
            style={{ width: 180 }}
            value={status}
          />
        </Space>
      }
      description={pageDescription}
      title={pageTitle}
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="这里直接绑定对应的独立审核开关，和总览中心保持同步。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新的内容会直接进入公开链路。"
          description="开启人工审核后，新内容会先进入当前页面对应的待审核队列。"
          enabled={moderationEnabled}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的内容会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={items.filter((item) => item.status === "pending").length}
          title={pageTitle}
        />
      </AdminPanel>

      <AdminPanel title={isArticleMode ? "文章列表" : "动态列表"}>
        <Table
          bordered
          columns={[
            {
              key: "cover",
              render: (_, record: PostRecord) =>
                record.images[0]?.url ? (
                  <Image
                    alt={record.title}
                    height={64}
                    preview={false}
                    src={record.images[0].url}
                    width={96}
                  />
                ) : (
                  <div className="admin-cover-thumb admin-cover-thumb--empty">无封面</div>
                ),
              title: "封面",
              width: 120
            },
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
              render: (value: PostRecord["status"]) => <Tag>{postStatusLabel(value)}</Tag>,
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: PostRecord) => (
                <Space size="small" wrap>
                  <Button
                    onClick={() => {
                      setDetailId(record.id);
                    }}
                    size="small"
                    type="link"
                  >
                    详情
                  </Button>
                  {record.status === "pending" ? (
                    <>
                      <Button onClick={() => updateStatus(record.id, "published")} size="small" type="primary">
                        通过发布
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = promptRejectionReason();
                          if (!reason) {
                            return;
                          }
                          updateStatus(record.id, "rejected", reason);
                        }}
                        size="small"
                      >
                        驳回
                      </Button>
                    </>
                  ) : null}
                  {record.status === "published" ? (
                    <>
                      <Button onClick={() => updateStatus(record.id, "hidden")} size="small">
                        下架
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = promptRejectionReason();
                          if (!reason) {
                            return;
                          }
                          updateStatus(record.id, "rejected", reason);
                        }}
                        size="small"
                      >
                        驳回
                      </Button>
                    </>
                  ) : null}
                  {(record.status === "rejected" || record.status === "hidden") ? (
                    <Button onClick={() => updateStatus(record.id, "published")} size="small">
                      恢复发布
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 260
            }
          ]}
          dataSource={filteredItems}
          loading={postsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>

      <Modal
        footer={null}
        onCancel={() => setDetailId(null)}
        open={Boolean(detailId)}
        title="内容详情"
        width={880}
      >
        {detailQuery.data?.item ? (
          <div className="admin-detail-sheet">
            {detailQuery.data.item.images[0]?.url ? (
              <Image
                alt={detailQuery.data.item.title}
                className="admin-detail-sheet__cover"
                preview={false}
                src={detailQuery.data.item.images[0].url}
              />
            ) : (
              <div className="admin-detail-sheet__cover admin-detail-sheet__cover--empty">暂无封面</div>
            )}
            <div className="admin-detail-sheet__meta">
              <Tag>{detailQuery.data.item.type === "article" ? "文章" : "动态"}</Tag>
              <Tag>{postStatusLabel(detailQuery.data.item.status)}</Tag>
              <span>{detailQuery.data.item.author.displayName}</span>
            </div>
            <h3 className="admin-detail-sheet__title">{detailQuery.data.item.title}</h3>
            <div className="admin-detail-sheet__body">
              {detailQuery.data.item.contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: detailQuery.data.item.contentHtml }} />
              ) : (
                <p>{detailQuery.data.item.content}</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
