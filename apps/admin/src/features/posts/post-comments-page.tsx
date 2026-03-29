import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Input, Segmented, Space, Table, Tabs, Tag } from "antd";
import { useMemo, useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type CommentStatusFilter = "all" | "pending" | "visible" | "hidden";
type PostCommentRecord = Awaited<ReturnType<typeof apiClient.listAdminPostComments>>["items"][number];
type ReviewCommentRecord = Awaited<ReturnType<typeof apiClient.listAdminReviewComments>>["items"][number];
type RankingCommentRecord = Awaited<ReturnType<typeof apiClient.listAdminRankingComments>>["items"][number];
type RankingItemCommentRecord = Awaited<
  ReturnType<typeof apiClient.listAdminRankingItemComments>
>["items"][number];

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "可见", value: "visible" },
  { label: "已隐藏", value: "hidden" }
] as const;

function includesKeyword(keyword: string, values: Array<string | null | undefined>) {
  if (!keyword) {
    return true;
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(keyword));
}

function renderStatus(status: "pending" | "visible" | "hidden") {
  return <Tag color={status === "visible" ? "green" : status === "pending" ? "gold" : "default"}>{status === "visible" ? "可见" : status === "pending" ? "待审核" : "已隐藏"}</Tag>;
}

export function PostCommentsPage() {
  const [status, setStatus] = useState<CommentStatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const normalizedStatus = status === "all" ? undefined : status;
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-comments", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const postCommentsQuery = useQuery({
    queryKey: ["admin-comments", "posts", normalizedStatus],
    queryFn: () => apiClient.listAdminPostComments(normalizedStatus)
  });
  const reviewCommentsQuery = useQuery({
    queryKey: ["admin-comments", "reviews", normalizedStatus],
    queryFn: () => apiClient.listAdminReviewComments(normalizedStatus)
  });
  const rankingCommentsQuery = useQuery({
    queryKey: ["admin-comments", "rankings", normalizedStatus],
    queryFn: () => apiClient.listAdminRankingComments(normalizedStatus)
  });
  const rankingItemCommentsQuery = useQuery({
    queryKey: ["admin-comments", "ranking-items", normalizedStatus],
    queryFn: () => apiClient.listAdminRankingItemComments(normalizedStatus)
  });

  const keyword = searchText.trim().toLowerCase();
  const filteredPostComments = useMemo(
    () =>
      (postCommentsQuery.data?.items ?? []).filter((item) =>
        includesKeyword(keyword, [item.postTitle, item.content, item.author.displayName])
      ),
    [keyword, postCommentsQuery.data?.items]
  );
  const filteredReviewComments = useMemo(
    () =>
      (reviewCommentsQuery.data?.items ?? []).filter((item) =>
        includesKeyword(keyword, [item.reviewTitle, item.content, item.author.displayName])
      ),
    [keyword, reviewCommentsQuery.data?.items]
  );
  const filteredRankingComments = useMemo(
    () =>
      (rankingCommentsQuery.data?.items ?? []).filter((item) =>
        includesKeyword(keyword, [item.rankingTitle, item.content, item.author.displayName])
      ),
    [keyword, rankingCommentsQuery.data?.items]
  );
  const filteredRankingItemComments = useMemo(
    () =>
      (rankingItemCommentsQuery.data?.items ?? []).filter((item) =>
        includesKeyword(keyword, [item.rankingTitle, item.rankingItemTitle, item.content, item.author.displayName])
      ),
    [keyword, rankingItemCommentsQuery.data?.items]
  );

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      if (!current) {
        return;
      }

      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(current, {
          commentModerationEnabled: enabled
        })
      );
      await Promise.all([
        siteSettingsQuery.refetch(),
        postCommentsQuery.refetch(),
        reviewCommentsQuery.refetch(),
        rankingCommentsQuery.refetch(),
        rankingItemCommentsQuery.refetch()
      ]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "评论审核开关更新失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const pendingCount =
    (postCommentsQuery.data?.items ?? []).filter((item) => item.status === "pending").length +
    (reviewCommentsQuery.data?.items ?? []).filter((item) => item.status === "pending").length +
    (rankingCommentsQuery.data?.items ?? []).filter((item) => item.status === "pending").length +
    (rankingItemCommentsQuery.data?.items ?? []).filter((item) => item.status === "pending").length;

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Input.Search
            allowClear
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder="搜索评论内容、作者、帖子、评测、榜单或条目"
            style={{ width: 320 }}
            value={searchText}
          />
          <Segmented
            onChange={(value) => {
              setStatus(value as CommentStatusFilter);
            }}
            options={statusOptions as unknown as Array<{ label: string; value: string }>}
            value={status}
          />
        </Space>
      }
      description="统一审核所有评论域的显示状态和举报处理。"
      title="评论审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="人工审核开启后，新评论会统一进入待审核状态。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，评论会直接公开显示。"
          description="帖子、评测、榜单和条目评论共用这一开关。"
          enabled={siteSettingsQuery.data?.item.commentModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新评论会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={pendingCount}
          title="评论审核"
        />
      </AdminPanel>

      <AdminPanel title="评论队列">
        <Tabs
          items={[
            {
              key: "posts",
              label: `帖子评论 ${filteredPostComments.length}`,
              children: (
                <Table
                  bordered
                  columns={[
                    { title: "来源", key: "source", render: (_, record: PostCommentRecord) => record.postTitle },
                    { title: "评论", dataIndex: "content", key: "content" },
                    { title: "举报量", key: "reportCount", render: (_, record: PostCommentRecord) => <Tag color="red">{record.reportCount ?? 0}</Tag>, width: 100 },
                    { title: "状态", key: "status", render: (_, record: PostCommentRecord) => renderStatus(record.status), width: 100 },
                    {
                      title: "操作",
                      key: "action",
                      render: (_, record: PostCommentRecord) => (
                        <Space wrap>
                          <Button onClick={() => void apiClient.updateAdminPostCommentStatus(record.id, { status: "hidden" }).then(() => postCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">隐藏</Button>
                          <Button onClick={() => void apiClient.updateAdminPostCommentStatus(record.id, { status: "visible" }).then(() => postCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">恢复</Button>
                        </Space>
                      ),
                      width: 140
                    }
                  ]}
                  dataSource={filteredPostComments}
                  locale={{ emptyText: <Empty description="暂无帖子评论" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  rowKey={(record) => record.id}
                  size="middle"
                />
              )
            },
            {
              key: "reviews",
              label: `评测评论 ${filteredReviewComments.length}`,
              children: (
                <Table
                  bordered
                  columns={[
                    { title: "来源", key: "source", render: (_, record: ReviewCommentRecord) => record.reviewTitle },
                    { title: "评论", dataIndex: "content", key: "content" },
                    { title: "举报量", key: "reportCount", render: (_, record: ReviewCommentRecord) => <Tag color="red">{record.reportCount ?? 0}</Tag>, width: 100 },
                    { title: "状态", key: "status", render: (_, record: ReviewCommentRecord) => renderStatus(record.status), width: 100 },
                    {
                      title: "操作",
                      key: "action",
                      render: (_, record: ReviewCommentRecord) => (
                        <Space wrap>
                          <Button onClick={() => void apiClient.updateAdminReviewCommentStatus(record.id, { status: "hidden" }).then(() => reviewCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">隐藏</Button>
                          <Button onClick={() => void apiClient.updateAdminReviewCommentStatus(record.id, { status: "visible" }).then(() => reviewCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">恢复</Button>
                        </Space>
                      ),
                      width: 140
                    }
                  ]}
                  dataSource={filteredReviewComments}
                  locale={{ emptyText: <Empty description="暂无评测评论" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  rowKey={(record) => record.id}
                  size="middle"
                />
              )
            },
            {
              key: "rankings",
              label: `榜单评论 ${filteredRankingComments.length}`,
              children: (
                <Table
                  bordered
                  columns={[
                    { title: "来源", key: "source", render: (_, record: RankingCommentRecord) => record.rankingTitle },
                    { title: "评论", dataIndex: "content", key: "content" },
                    { title: "举报量", key: "reportCount", render: (_, record: RankingCommentRecord) => <Tag color="red">{record.reportCount ?? 0}</Tag>, width: 100 },
                    { title: "状态", key: "status", render: (_, record: RankingCommentRecord) => renderStatus(record.status), width: 100 },
                    {
                      title: "操作",
                      key: "action",
                      render: (_, record: RankingCommentRecord) => (
                        <Space wrap>
                          <Button onClick={() => void apiClient.updateAdminRankingCommentStatus(record.id, { status: "hidden" }).then(() => rankingCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">隐藏</Button>
                          <Button onClick={() => void apiClient.updateAdminRankingCommentStatus(record.id, { status: "visible" }).then(() => rankingCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">恢复</Button>
                        </Space>
                      ),
                      width: 140
                    }
                  ]}
                  dataSource={filteredRankingComments}
                  locale={{ emptyText: <Empty description="暂无榜单评论" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  rowKey={(record) => record.id}
                  size="middle"
                />
              )
            },
            {
              key: "ranking-items",
              label: `条目评论 ${filteredRankingItemComments.length}`,
              children: (
                <Table
                  bordered
                  columns={[
                    { title: "来源", key: "source", render: (_, record: RankingItemCommentRecord) => `${record.rankingTitle} / ${record.rankingItemTitle}` },
                    { title: "评论", dataIndex: "content", key: "content" },
                    { title: "举报量", key: "reportCount", render: (_, record: RankingItemCommentRecord) => <Tag color="red">{record.reportCount ?? 0}</Tag>, width: 100 },
                    { title: "状态", key: "status", render: (_, record: RankingItemCommentRecord) => renderStatus(record.status), width: 100 },
                    {
                      title: "操作",
                      key: "action",
                      render: (_, record: RankingItemCommentRecord) => (
                        <Space wrap>
                          <Button onClick={() => void apiClient.updateAdminRankingItemCommentStatus(record.id, { status: "hidden" }).then(() => rankingItemCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">隐藏</Button>
                          <Button onClick={() => void apiClient.updateAdminRankingItemCommentStatus(record.id, { status: "visible" }).then(() => rankingItemCommentsQuery.refetch()).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "评论状态更新失败"))} size="small" type="link">恢复</Button>
                        </Space>
                      ),
                      width: 140
                    }
                  ]}
                  dataSource={filteredRankingItemComments}
                  locale={{ emptyText: <Empty description="暂无条目评论" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  rowKey={(record) => record.id}
                  size="middle"
                />
              )
            }
          ]}
        />
      </AdminPanel>
    </AdminPage>
  );
}
