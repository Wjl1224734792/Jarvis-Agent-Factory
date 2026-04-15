import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RatingTargetComment } from "./rating-target-detail-types";
import { RatingTargetCommentCard } from "./rating-target-detail-comment-card";

const COLLAPSED_ROOT_LIMIT = 3;

type RatingTargetCommentListProps = {
  sortedComments: RatingTargetComment[];
  canInteract: boolean;
  itemId: string;
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
  /** 留言总条数（含回复），用于展开按钮文案 */
  totalCommentCount: number;
  /** 排序切换时收起列表 */
  commentSort: "latest" | "hot";
};

export function RatingTargetCommentList(props: RatingTargetCommentListProps) {
  const [expanded, setExpanded] = useState(false);

  const displayedComments = useMemo(() => {
    if (expanded || props.sortedComments.length <= COLLAPSED_ROOT_LIMIT) {
      return props.sortedComments;
    }
    return props.sortedComments.slice(0, COLLAPSED_ROOT_LIMIT);
  }, [expanded, props.sortedComments]);

  const canToggle = props.sortedComments.length > COLLAPSED_ROOT_LIMIT;

  useEffect(() => {
    setExpanded(false);
  }, [props.commentSort]);

  return (
    <div className="rounded-none border border-border/70 bg-white">
      {props.sortedComments.length > 0 ? (
        <div className="px-5 py-4">
          <div className="space-y-0">
            {displayedComments.map((comment, index) => (
              <div className={index === 0 ? "" : "border-t border-border/70 pt-4"} key={comment.id}>
                <RatingTargetCommentCard
                  canInteract={props.canInteract}
                  comment={comment}
                  itemId={props.itemId}
                  onRefresh={props.onRefresh}
                  onRequireLogin={props.onRequireLogin}
                />
              </div>
            ))}
          </div>
          {canToggle ? (
            <div className="border-t border-border/70 pt-3">
              {expanded ? (
                <Button
                  className="w-full"
                  onClick={() => {
                    setExpanded(false);
                  }}
                  type="button"
                  variant="ghost"
                >
                  收起评论
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    setExpanded(true);
                  }}
                  type="button"
                  variant="ghost"
                >
                  展开全部评论（共 {props.totalCommentCount} 条）
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有评论。</div>
      )}
    </div>
  );
}
