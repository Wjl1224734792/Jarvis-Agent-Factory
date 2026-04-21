import { describe, expect, it } from "vitest";
import { buildAdminAuditTracePlan } from "../src/lib/admin-audit-tracking";

describe("admin audit tracking helpers", () => {
  it("builds an entity-scoped trace plan when the exact entity id is known", () => {
    expect(
      buildAdminAuditTracePlan({
        domain: "brand_application",
        subjectLabel: "品牌申请",
        domainLabel: "品牌申请",
        exactEntityId: "brand_app_1"
      })
    ).toEqual({
      query: {
        domain: "brand_application",
        entityId: "brand_app_1",
        limit: 10
      },
      panelDescription:
        "展示当前聚焦品牌申请对应的最新 AI 审核记录；如为空，说明该对象还没有落到审核记录链路。",
      emptyText: "当前品牌申请暂未返回审核记录。",
      hint: null
    });
  });

  it("falls back to recent domain records when the page has not focused an exact entity yet", () => {
    expect(
      buildAdminAuditTracePlan({
        domain: "aircraft_submission",
        subjectLabel: "机型投稿",
        domainLabel: "机型投稿"
      })
    ).toEqual({
      query: {
        domain: "aircraft_submission",
        limit: 10
      },
      panelDescription: "当前还未聚焦到具体机型投稿，先展示机型投稿域最近的 AI 审核记录。",
      emptyText: "机型投稿域暂未返回审核记录。",
      hint: "如需精确追踪，请先在列表中选中具体机型投稿。"
    });
  });

  it("surfaces a non-blocking hint when the page cannot map the current list item to an exact entity id", () => {
    expect(
      buildAdminAuditTracePlan({
        domain: "comment",
        subjectLabel: "评论",
        domainLabel: "评论",
        unavailableReason: "当前接口暂无法把评论列表稳定映射到审核记录 entityId。"
      })
    ).toEqual({
      query: {
        domain: "comment",
        limit: 10
      },
      panelDescription: "当前暂无法定位精确评论审核对象，先展示评论域最近的 AI 审核记录。",
      emptyText: "评论域暂未返回审核记录。",
      hint: "当前接口暂无法把评论列表稳定映射到审核记录 entityId。"
    });
  });
});
