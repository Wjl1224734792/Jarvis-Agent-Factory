export function buildRatingTargetSubmission(rating: number, content: string) {
  const trimmed = content.trim();

  if (rating <= 0) {
    return null;
  }

  if (trimmed.length > 0) {
    return {
      kind: "review" as const,
      payload: {
        rating,
        content: trimmed
      }
    };
  }

  return {
    kind: "rating" as const,
    payload: {
      rating
    }
  };
}

export function canSubmitRatingTargetComment(input: {
  rating: number;
  content: string;
  isReplying: boolean;
}) {
  const trimmed = input.content.trim();
  if (!trimmed) {
    return false;
  }

  return input.isReplying || input.rating > 0;
}

type ViewerState = {
  hasLiked: boolean;
  hasReported: boolean;
};

type RatingTargetCommentNode = {
  id: string;
  parentCommentId: string | null;
  status: "pending" | "visible" | "hidden";
  rating: number | null;
  likeCount: number;
  reportCount: number;
  viewer: ViewerState;
  replies?: RatingTargetCommentNode[];
};

type RatingTargetDetailShape = {
  commentCount: number;
  comments: RatingTargetCommentNode[];
};

function updateCommentTree(
  comments: RatingTargetCommentNode[],
  commentId: string,
  updater: (comment: RatingTargetCommentNode) => RatingTargetCommentNode
) {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    const nextReplies = (comment.replies ?? []).map((reply) =>
      reply.id === commentId ? updater(reply) : reply
    );
    return {
      ...comment,
      replies: nextReplies
    };
  });
}

export function patchRatingTargetCommentLike<
  TDetail extends RatingTargetDetailShape
>(
  detail: TDetail,
  commentId: string,
  nextHasLiked: boolean
) {
  return {
    ...detail,
    comments: updateCommentTree(detail.comments, commentId, (comment) => ({
      ...comment,
      likeCount: Math.max(0, comment.likeCount + (nextHasLiked ? 1 : -1)),
      viewer: {
        ...comment.viewer,
        hasLiked: nextHasLiked
      }
    }))
  } as TDetail;
}

export function patchRatingTargetCommentReport<
  TDetail extends RatingTargetDetailShape
>(
  detail: TDetail,
  commentId: string
) {
  return {
    ...detail,
    comments: updateCommentTree(detail.comments, commentId, (comment) => ({
      ...comment,
      reportCount: Math.max(0, comment.reportCount + 1),
      viewer: {
        ...comment.viewer,
        hasReported: true
      }
    }))
  } as TDetail;
}

export function patchRatingTargetCommentCreated<
  TDetail extends RatingTargetDetailShape
>(
  detail: TDetail,
  comment: RatingTargetCommentNode
) {
  const countDelta = comment.status === "visible" ? 1 : 0;
  if (!comment.parentCommentId) {
    return {
      ...detail,
      commentCount: Math.max(0, detail.commentCount + countDelta),
      comments: [...detail.comments, comment]
    };
  }

  return {
    ...detail,
    commentCount: Math.max(0, detail.commentCount + countDelta),
    comments: detail.comments.map((entry) =>
      entry.id !== comment.parentCommentId
        ? entry
        : {
            ...entry,
            replies: [...(entry.replies ?? []), comment]
          }
    )
  };
}
