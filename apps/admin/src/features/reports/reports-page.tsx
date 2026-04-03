import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Input, Modal, Space, Table, Tag } from "antd";
import { useCallback, useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";

type DetailState = {
  kind:
    | "post"
    | "model"
    | "review"
    | "rating-target"
    | "post-comment"
    | "review-comment"
    | "model-comment"
    | "ranking-comment"
    | "rating-target-comment";
  id: string;
  title: string;
  subtitle?: string | null;
  preview?: string | null;
};

type CommentModerationRow = {
  kind: "post-comment" | "review-comment" | "model-comment" | "ranking-comment" | "rating-target-comment";
  id: string;
  title: string;
  subtitle?: string | null;
  preview?: string | null;
  status: "pending" | "visible" | "hidden";
  reportCount: number;
  onToggle: () => Promise<unknown>;
};

type ContentModerationRow = {
  kind: "model" | "review" | "rating-target";
  id: string;
  title: string;
  subtitle?: string | null;
  preview?: string | null;
  reportCount: number;
};

type ModerationRow = ContentModerationRow | CommentModerationRow;

function isCommentModerationRow(row: ModerationRow): row is CommentModerationRow {
  return "onToggle" in row;
}

export function ReportsPage() {
  const [searchText, setSearchText] = useState("");
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const postsQuery = useQuery({ queryKey: ["admin-report-posts"], queryFn: () => apiClient.listAdminPosts() });
  const reviewsQuery = useQuery({ queryKey: ["admin-report-reviews"], queryFn: () => apiClient.listAdminReviews() });
  const modelsQuery = useQuery({ queryKey: ["admin-report-models"], queryFn: () => apiClient.listModels() });
  const ratingTargetsQuery = useQuery({
    queryKey: ["admin-report-rating-targets"],
    queryFn: () => apiClient.listRatingTargetsForModeration()
  });
  const postCommentsQuery = useQuery({
    queryKey: ["admin-report-post-comments"],
    queryFn: () => apiClient.listAdminPostComments()
  });
  const reviewCommentsQuery = useQuery({
    queryKey: ["admin-report-review-comments"],
    queryFn: () => apiClient.listAdminReviewComments()
  });
  const modelCommentsQuery = useQuery({
    queryKey: ["admin-report-model-comments"],
    queryFn: () => apiClient.listAdminModelComments()
  });
  const rankingCommentsQuery = useQuery({
    queryKey: ["admin-report-ranking-comments"],
    queryFn: () => apiClient.listAdminRankingComments()
  });
  const ratingTargetCommentsQuery = useQuery({
    queryKey: ["admin-report-rating-target-comments"],
    queryFn: () => apiClient.listAdminRatingTargetComments()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-report-detail", detail?.kind, detail?.id],
    queryFn: () => {
      if (!detail) {
        throw new Error("Missing report detail target.");
      }
      return apiClient.getAdminReportDetails(detail.kind, detail.id);
    },
    enabled: Boolean(detail)
  });

  const keyword = searchText.trim().toLowerCase();
  const includesKeyword = useCallback(
    (...values: Array<string | null | undefined>) =>
      !keyword ? true : values.some((value) => String(value ?? "").toLowerCase().includes(keyword)),
    [keyword]
  );

  async function refreshAll() {
    await Promise.all([
      postsQuery.refetch(),
      reviewsQuery.refetch(),
      modelsQuery.refetch(),
      ratingTargetsQuery.refetch(),
      postCommentsQuery.refetch(),
      reviewCommentsQuery.refetch(),
      modelCommentsQuery.refetch(),
      rankingCommentsQuery.refetch(),
      ratingTargetCommentsQuery.refetch(),
      detailQuery.refetch()
    ]);
  }

  const posts = useMemo(
    () =>
      (postsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword(item.title, item.contentPreview, item.author.displayName)),
    [includesKeyword, postsQuery.data?.items]
  );
  const reviews = useMemo(
    () =>
      (reviewsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword(item.model.name, item.content ?? "", item.author.displayName)),
    [includesKeyword, reviewsQuery.data?.items]
  );
  const models = useMemo(
    () =>
      (modelsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword(item.name, item.brand.name, item.category.name)),
    [includesKeyword, modelsQuery.data?.items]
  );
  const ratingTargets = useMemo(
    () =>
      (ratingTargetsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword(item.title, item.rankingTitle, item.rankingAuthorName)),
    [includesKeyword, ratingTargetsQuery.data?.items]
  );
  const comments = useMemo(
    () =>
      [
        ...(postCommentsQuery.data?.items ?? []).map((item) => ({
          kind: "post-comment" as const,
          id: item.id,
          title: item.postTitle,
          subtitle: item.author.displayName,
          preview: item.content,
          status: item.status,
          reportCount: item.reportCount ?? 0,
          onToggle: () => apiClient.updateAdminPostCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
        })),
        ...(reviewCommentsQuery.data?.items ?? []).map((item) => ({
          kind: "review-comment" as const,
          id: item.id,
          title: item.reviewTitle,
          subtitle: item.author.displayName,
          preview: item.content,
          status: item.status,
          reportCount: item.reportCount ?? 0,
          onToggle: () => apiClient.updateAdminReviewCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
        })),
        ...(modelCommentsQuery.data?.items ?? []).map((item) => ({
          kind: "model-comment" as const,
          id: item.id,
          title: item.model.name,
          subtitle: item.author.displayName,
          preview: item.content,
          status: item.status,
          reportCount: item.reportCount ?? 0,
          onToggle: () => apiClient.updateAdminModelCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
        })),
        ...(rankingCommentsQuery.data?.items ?? []).map((item) => ({
          kind: "ranking-comment" as const,
          id: item.id,
          title: item.rankingTitle,
          subtitle: item.author.displayName,
          preview: item.content,
          status: item.status,
          reportCount: item.reportCount ?? 0,
          onToggle: () => apiClient.updateAdminRankingCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
        })),
        ...(ratingTargetCommentsQuery.data?.items ?? []).map((item) => ({
          kind: "rating-target-comment" as const,
          id: item.id,
          title: `${item.rankingTitle} / ${item.ratingTargetTitle}`,
          subtitle: item.author.displayName,
          preview: item.content,
          status: item.status,
          reportCount: item.reportCount ?? 0,
          onToggle: () => apiClient.updateAdminRatingTargetCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
        }))
      ]
        .filter((item) => item.reportCount > 0)
        .filter((item) => includesKeyword(item.title, item.subtitle, item.preview)),
    [
      includesKeyword,
      modelCommentsQuery.data?.items,
      postCommentsQuery.data?.items,
      rankingCommentsQuery.data?.items,
      ratingTargetCommentsQuery.data?.items,
      reviewCommentsQuery.data?.items
    ]
  );
  const moderationRows = useMemo<ModerationRow[]>(
    () => [
      ...models.map((item) => ({
        kind: "model" as const,
        id: item.id,
        title: item.name,
        subtitle: `${item.brand.name} 路 ${item.category.name}`,
        preview: item.summary,
        reportCount: item.reportCount ?? 0
      })),
      ...reviews.map((item) => ({
        kind: "review" as const,
        id: item.id,
        title: item.model.name,
        subtitle: item.author.displayName,
        preview: item.content,
        reportCount: item.reportCount ?? 0
      })),
      ...ratingTargets.map((item) => ({
        kind: "rating-target" as const,
        id: item.id,
        title: item.title,
        subtitle: `${item.rankingTitle} 路 ${item.rankingAuthorName}`,
        preview: item.summary,
        reportCount: item.reportCount ?? 0
      })),
      ...comments
    ],
    [comments, models, ratingTargets, reviews]
  );

  return (
    <AdminPage
      actions={
        <Input.Search
          allowClear
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          placeholder="搜索被举报的标题、作者、摘要或评论"
          style={{ width: 320 }}
          value={searchText}
        />
      }
      description="集中查看被举报内容，并在详情里直接核对举报理由和证据图。"
      title="举报内容审核"
    >
      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <AdminPanel title="被举报文章 / 动态">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: (typeof posts)[number]) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">{record.author.displayName}</div>
                </div>
              ),
              title: "内容"
            },
            {
              key: "reports",
              render: (_, record: (typeof posts)[number]) => <Tag color="red">举报 {record.reportCount}</Tag>,
              title: "举报",
              width: 110
            },
            {
              key: "action",
              render: (_, record: (typeof posts)[number]) => (
                <Space size="small">
                  <Button size="small" type="link" onClick={() => setDetail({ kind: "post", id: record.id, title: record.title, subtitle: record.author.displayName, preview: record.contentPreview })}>详情</Button>
                  <Button size="small" type="link" onClick={() => {
                    const reason = promptRejectionReason("请输入内容驳回返修原因");
                    if (!reason) return;
                    setActionError(null);
                    void apiClient.updateAdminPostStatus(record.id, { status: "rejected", rejectionReason: reason }).then(() => refreshAll()).catch((reasonValue: unknown) => setActionError(reasonValue instanceof Error ? reasonValue.message : "处理失败"));
                  }}>驳回返修</Button>
                  <Button size="small" type="link" onClick={() => {
                    setActionError(null);
                    void apiClient.updateAdminPostStatus(record.id, { status: "hidden" }).then(() => refreshAll()).catch((reasonValue: unknown) => setActionError(reasonValue instanceof Error ? reasonValue.message : "处理失败"));
                  }}>下线隐藏</Button>
                </Space>
              ),
              title: "操作",
              width: 220
            }
          ]}
          dataSource={posts}
          locale={{ emptyText: <Empty description="暂无被举报文章或动态" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={postsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>

      <AdminPanel title="被举报评测 / 机型 / 条目 / 评论">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: ModerationRow) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">{record.subtitle ?? null}</div>
                </div>
              ),
              title: "对象"
            },
            {
              key: "reports",
              render: (_, record: ModerationRow) => <Tag color="red">举报 {record.reportCount}</Tag>,
              title: "举报",
              width: 110
            },
            {
              key: "action",
              render: (_, record: ModerationRow) => (
                <Space size="small">
                  <Button size="small" type="link" onClick={() => setDetail({ kind: record.kind, id: record.id, title: record.title, subtitle: record.subtitle, preview: record.preview })}>详情</Button>
                  {isCommentModerationRow(record) ? (
                    <Button size="small" type="link" onClick={() => {
                      setActionError(null);
                      void record.onToggle().then(() => refreshAll()).catch((reasonValue: unknown) => setActionError(reasonValue instanceof Error ? reasonValue.message : "处理失败"));
                    }}>{record.status === "visible" ? "隐藏" : "恢复显示"}</Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 180
            }
          ]}
          dataSource={moderationRows}
          locale={{ emptyText: <Empty description="暂无被举报内容" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={modelsQuery.isLoading || reviewsQuery.isLoading || ratingTargetsQuery.isLoading || postCommentsQuery.isLoading || reviewCommentsQuery.isLoading || modelCommentsQuery.isLoading || rankingCommentsQuery.isLoading || ratingTargetCommentsQuery.isLoading}
          rowKey={(record) => `${record.kind}-${record.id}`}
          size="middle"
        />
      </AdminPanel>

      <Modal footer={null} onCancel={() => setDetail(null)} open={Boolean(detail)} title="举报详情" width={820}>
        {detail ? (
          <div className="admin-detail-sheet">
            <div className="admin-detail-sheet__cover admin-detail-sheet__cover--empty">举报证据</div>
            <div className="admin-detail-sheet__meta">
              <Tag>{detail.kind}</Tag>
              {detail.subtitle ? <span>{detail.subtitle}</span> : null}
            </div>
            <h3 className="admin-detail-sheet__title">{detail.title}</h3>
            {detail.preview ? <div className="admin-detail-sheet__body"><p>{detail.preview}</p></div> : null}
            {detailQuery.isLoading ? <div className="admin-detail-sheet__body"><p>加载举报明细中...</p></div> : null}
            {detailQuery.data?.items?.length ? (
              <div className="admin-field-stack">
                {detailQuery.data.items.map((report) => (
                  <div className="admin-panel" key={report.id}>
                    <div className="admin-panel__body">
                      <div className="admin-table-meta">
                        <div className="admin-table-title">{report.reporter.displayName}</div>
                        <div className="admin-table-subtitle">{new Date(report.createdAt).toLocaleString("zh-CN", { hour12: false })}</div>
                      </div>
                      <p>{report.reason}</p>
                      {report.evidenceImages.length ? (
                        <div className="admin-image-grid">
                          {report.evidenceImages.map((image) => (
                            <Image key={image.id} alt={image.fileName ?? "report evidence"} height={96} src={image.url} width={144} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : detailQuery.data ? (
              <Empty description="暂无举报明细" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
