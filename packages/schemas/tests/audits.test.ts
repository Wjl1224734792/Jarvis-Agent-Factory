import { describe, expect, it } from "vitest";
import {
  adminAuditRecordListQuerySchema,
  adminAuditRecordListResponseSchema
} from "../src/audits";

describe("audits contract", () => {
  it("parses admin audit record queries", () => {
    const query = adminAuditRecordListQuerySchema.parse({
      domain: "post",
      entityId: "post_1",
      limit: 20
    });

    expect(query.domain).toBe("post");
    expect(query.entityId).toBe("post_1");
    expect(query.limit).toBe(20);
  });

  it("parses admin audit record list responses", () => {
    const payload = adminAuditRecordListResponseSchema.parse({
      items: [
        {
          id: "audit_1",
          domain: "post",
          entityId: "post_1",
          contentType: "text",
          provider: "qiniu",
          mode: "ai",
          status: "needs_manual_review",
          suggestion: "review",
          scene: "antispam",
          requestId: "req_1",
          taskId: null,
          detailLabels: ["abuse"],
          sceneSuggestions: {
            antispam: "review"
          },
          rawPayload: {
            mock: true
          },
          errorMessage: null,
          callbackReceivedAt: null,
          resolvedAt: "2026-04-21T00:00:00.000Z",
          reviewedBy: null,
          reviewNote: null,
          createdAt: "2026-04-21T00:00:00.000Z",
          updatedAt: "2026-04-21T00:00:00.000Z"
        }
      ]
    });

    expect(payload.items[0]?.status).toBe("needs_manual_review");
    expect(payload.items[0]?.detailLabels).toEqual(["abuse"]);
  });
});
