import type { RatingTargetComment } from "./rating-target-detail-types";
import { RatingTargetCommentCard } from "./rating-target-detail-comment-card";

type RatingTargetCommentListProps = {
  sortedComments: RatingTargetComment[];
  canInteract: boolean;
  itemId: string;
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
};

export function RatingTargetCommentList(props: RatingTargetCommentListProps) {
  return (
    <div className="rounded-none border border-border/70 bg-white">
      {props.sortedComments.length > 0 ? (
        <div className="space-y-0 px-5 py-4">
          {props.sortedComments.map((comment, index) => (
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
      ) : (
        <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有评论。</div>
      )}
    </div>
  );
}
