import { RatingStars } from "@/components/rating-stars";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";

type RatingTargetCommentChannelProps = {
  authStatus: string;
  busy: boolean;
  content: string;
  setContent: (value: string) => void;
  selectedRating: number;
  setSelectedRating: (value: number) => void;
  replyingTo: { id: string; displayName: string } | null;
  ratingLabel: string;
  onSubmit: () => void;
  canSubmit: boolean;
  openLoginPrompt: () => void;
  onCancelReply: () => void;
  actionError: string | null;
  placeholder: string;
};

export function RatingTargetCommentChannel(props: RatingTargetCommentChannelProps) {
  return (
    <div className="rounded-none border border-border/70 bg-white px-5 py-5">
      <div className="space-y-4">
        {props.replyingTo ? (
          <Alert>
            <AlertTitle>正在回复</AlertTitle>
            <AlertDescription>
              当前回复 @{props.replyingTo.displayName}，回复不需要选择评分。
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{props.ratingLabel}</div>
            <RatingStars
              className="text-rating-orange"
              onSelect={props.setSelectedRating}
              size="lg"
              tone="rating"
              value={props.selectedRating}
            />
          </div>
        )}

        {props.authStatus === "authenticated" ? (
          <InlineCommentComposer
            busy={props.busy}
            disabled={props.busy || !props.canSubmit}
            onChange={props.setContent}
            onSubmit={props.onSubmit}
            placeholder={props.placeholder}
            value={props.content}
          />
        ) : (
          <Button className="w-full" onClick={props.openLoginPrompt} size="sm" type="button" variant="outline">
            登录后参与互动
          </Button>
        )}

        {props.replyingTo ? (
          <Button className="w-fit" onClick={props.onCancelReply} size="sm" type="button" variant="ghost">
            取消回复
          </Button>
        ) : null}

        {props.actionError ? (
          <Alert variant="destructive">
            <AlertTitle>评分对象互动失败</AlertTitle>
            <AlertDescription>{props.actionError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
