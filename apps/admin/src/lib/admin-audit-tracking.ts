import { apiClient } from "./api-client";

export type AdminAuditDomain =
  | "post"
  | "review"
  | "file"
  | "brand_application"
  | "aircraft_submission"
  | "ranking"
  | "rating_target"
  | "comment";

export interface AdminAuditTracePlan {
  query: {
    domain: AdminAuditDomain;
    entityId?: string;
    limit: number;
  };
  panelDescription: string;
  emptyText: string;
  hint: string | null;
}

export type AdminManualAuditDomain =
  | "file"
  | "brand_application"
  | "aircraft_submission"
  | "comment";

/**
 * 将最新一条人工审核记录同步为指定审核结论。
 * @param input 审核域、实体 ID、目标状态和可选审核备注。
 * @returns 找到最近审核记录时返回更新结果；未找到时返回 `null`。
 * @throws 当审核记录查询或更新请求失败时透传客户端异常。
 */
export async function syncLatestAdminAuditManualDecision(input: {
  domain: AdminManualAuditDomain;
  entityId: string;
  status: "manual_passed" | "manual_rejected";
  reviewNote?: string | null;
}) {
  const latest = await apiClient.listAdminAuditRecords({
    domain: input.domain,
    entityId: input.entityId,
    limit: 1
  });
  const audit = latest.items[0];
  if (!audit) {
    return null;
  }

  return apiClient.updateAdminAuditManualReview(audit.id, {
    status: input.status,
    reviewNote: input.reviewNote ?? null
  });
}

/**
 * 为后台审核页生成统一的审核追踪查询与降级文案。
 * @param input 审核域、展示文案和精确对象定位信息。
 * @returns 可直接驱动审核追踪面板的查询计划和提示文案。
 * @throws 本函数不主动抛出异常。
 */
export function buildAdminAuditTracePlan(input: {
  domain: AdminAuditDomain;
  subjectLabel: string;
  domainLabel: string;
  exactEntityId?: string | null;
  unavailableReason?: string;
  limit?: number;
}): AdminAuditTracePlan {
  const limit = input.limit ?? 10;

  if (input.exactEntityId) {
    return {
      query: {
        domain: input.domain,
        entityId: input.exactEntityId,
        limit
      },
      panelDescription: `展示当前聚焦${input.subjectLabel}对应的最新 AI 审核记录；如为空，说明该对象还没有落到审核记录链路。`,
      emptyText: `当前${input.subjectLabel}暂未返回审核记录。`,
      hint: null
    };
  }

  return {
    query: {
      domain: input.domain,
      limit
    },
    panelDescription: input.unavailableReason
      ? `当前暂无法定位精确${input.subjectLabel}审核对象，先展示${input.domainLabel}域最近的 AI 审核记录。`
      : `当前还未聚焦到具体${input.subjectLabel}，先展示${input.domainLabel}域最近的 AI 审核记录。`,
    emptyText: `${input.domainLabel}域暂未返回审核记录。`,
    hint: input.unavailableReason ?? `如需精确追踪，请先在列表中选中具体${input.subjectLabel}。`
  };
}
