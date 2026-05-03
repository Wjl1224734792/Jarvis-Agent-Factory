import type { ModerationMode } from "@feijia/schemas";
import { auditsRepo } from "./audits.repo";
import { qiniuAuditService } from "./qiniu-audit.service";

type TextModerationAction = "approve" | "manual_review" | "reject";

function buildRejectedReason(mode: ModerationMode, status: string | null | undefined) {
  if (mode === "automatic") {
    return status === "failed"
      ? "自动审核异常，已按未通过处理，请修改后重新提交。"
      : "自动审核未通过，请修改后重新提交。";
  }

  return status === "failed"
    ? "AI审核异常，已按未通过处理，请修改后重新提交。"
    : "AI审核未通过，请修改后重新提交。";
}

export async function evaluateTextModeration(input: {
  mode: ModerationMode;
  domain: string;
  entityId: string;
  text: string;
}) {
  if (input.mode === "manual") {
    const auditRecord = await auditsRepo.create({
      domain: input.domain,
      entityId: input.entityId,
      contentType: "text",
      mode: "manual",
      status: "queued"
    });

    return {
      action: "manual_review" as TextModerationAction,
      auditRecord,
      rejectionReason: null
    };
  }

  const auditRecord = await qiniuAuditService.reviewText({
    domain: input.domain,
    entityId: input.entityId,
    text: input.text,
    mode: input.mode === "automatic" ? "automatic" : "ai"
  });

  const status = auditRecord?.status;
  if (status === "passed") {
    return {
      action: "approve" as TextModerationAction,
      auditRecord,
      rejectionReason: null
    };
  }

  if (status === "needs_manual_review") {
    return {
      action: input.mode === "ai" ? ("manual_review" as TextModerationAction) : ("reject" as TextModerationAction),
      auditRecord,
      rejectionReason: input.mode === "ai" ? null : buildRejectedReason(input.mode, status)
    };
  }

  if (status === "rejected") {
    return {
      action: "reject" as TextModerationAction,
      auditRecord,
      rejectionReason: buildRejectedReason(input.mode, status)
    };
  }

  return {
    action: input.mode === "ai" ? ("manual_review" as TextModerationAction) : ("reject" as TextModerationAction),
    auditRecord,
    rejectionReason: input.mode === "ai" ? null : buildRejectedReason(input.mode, status)
  };
}
