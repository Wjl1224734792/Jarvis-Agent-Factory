export type AdminAuditDomain =
  | "post"
  | "review"
  | "file"
  | "brand_application"
  | "aircraft_submission"
  | "ranking"
  | "rating_target"
  | "comment";

export type AdminAuditTracePlan = {
  query: {
    domain: AdminAuditDomain;
    entityId?: string;
    limit: number;
  };
  panelDescription: string;
  emptyText: string;
  hint: string | null;
};

/**
 * 为后台审核页生成统一的审核追踪查询与降级文案。
 * 有精确 entityId 时走对象级追踪；否则退回到域级最近记录，并明确提示边界。
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
