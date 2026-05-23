import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Clock3Icon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { ProfilePagination } from "./profile-surface";

/** 评论列表项类型（后端 API 尚未正式定义，此处预留结构） */
interface UserCommentItem {
  id: string;
  postId: string;
  postTitle: string;
  postType: "article" | "moment";
  content: string;
  createdAt: string;
}

const COMMENT_PAGE_SIZE = 10;

/**
 * 我的评论 Tab -- 展示当前用户发表的所有评论，支持删除。
 *
 * 当后端 `listUserComments` API 就绪后，替换 queryFn 中的占位实现即可。
 */
export function ProfileMyCommentsTab(props: { userId: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /** 获取用户评论列表（当前返回空列表，后端 API 就绪后替换） */
  const commentsQuery = useQuery({
    queryKey: ["self-profile-comments", props.userId],
    queryFn: async (): Promise<{ items: UserCommentItem[]; total: number }> => {
      // TODO: 后端 listUserComments API 就绪后替换为：
      // return apiClient.listUserComments(props.userId, { page, pageSize: COMMENT_PAGE_SIZE });
      return { items: [], total: 0 };
    },
    enabled: Boolean(props.userId)
  });

  const comments: UserCommentItem[] = commentsQuery.data?.items ?? [];
  const total = commentsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / COMMENT_PAGE_SIZE));

  async function handleDeleteComment(comment: UserCommentItem) {
    if (!window.confirm("删除后无法恢复，确定要删除这条评论吗？")) {
      return;
    }
    setDeletingId(comment.id);
    try {
      await apiClient.deletePostComment(comment.postId, comment.id);
      await queryClient.invalidateQueries({ queryKey: ["self-profile-comments", props.userId] });
      toast.success("评论已删除");
    } catch {
      toast.error("评论删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  }

  if (commentsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="rounded-xl border border-border/60 bg-white p-4" key={i}>
            <Skeleton className="mb-2 h-4 w-32 rounded-md" />
            <Skeleton className="mb-2 h-4 w-full rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (commentsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>评论加载失败</AlertTitle>
        <AlertDescription>
          {commentsQuery.error instanceof Error
            ? commentsQuery.error.message
            : "暂时无法加载评论列表，请稍后重试。"}
        </AlertDescription>
      </Alert>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        还没有发表过评论。
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/60 border border-border/60 bg-white">
        {comments.map((comment) => (
          <article className="flex w-full items-start gap-3 px-4 py-3" key={comment.id}>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="text-[0.72rem]" variant="outline">
                  评论
                </Badge>
                <Badge className="text-[0.72rem]" variant="outline">
                  {comment.postType === "article" ? "文章" : "动态"}
                </Badge>
              </div>
              <p className="line-clamp-2 text-[0.84rem] leading-snug text-foreground">
                {comment.content}
              </p>
              <div className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                <span>回复：</span>
                <Link
                  className="truncate font-medium text-primary hover:underline"
                  to={APP_ROUTES.postDetail.replace(":id", comment.postId)}
                >
                  {comment.postTitle}
                </Link>
              </div>
              <div className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                <Clock3Icon className="size-3 shrink-0" />
                <span>{new Date(comment.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-1.5 self-start pt-0.5">
              <Button
                className="h-8 px-2.5 text-[0.76rem]"
                disabled={deletingId === comment.id}
                onClick={() => handleDeleteComment(comment)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2Icon data-icon="inline-start" />
                {deletingId === comment.id ? "处理中..." : "删除"}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <ProfilePagination onPageChange={setPage} page={page} totalPages={totalPages} />
    </>
  );
}
