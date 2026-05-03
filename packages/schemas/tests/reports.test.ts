import { describe, expect, it } from "vitest";
import {
  adminReportRecordsResponseSchema,
  adminReportSummaryResponseSchema
} from "../src/reports";

describe("reports contract", () => {
  it("parses admin report detail records", () => {
    const payload = adminReportRecordsResponseSchema.parse({
      items: [
        {
          id: "report_1",
          reason: "Need moderator review.",
          createdAt: "2026-04-15T12:00:00.000Z",
          reporter: {
            id: "user_1",
            displayName: "Pilot",
            avatarUrl: null,
            role: "user"
          },
          evidenceImages: []
        }
      ]
    });

    expect(payload.items[0]?.id).toBe("report_1");
  });

  it("parses aggregated admin report summaries", () => {
    const payload = adminReportSummaryResponseSchema.parse({
      items: [
        {
          kind: "post",
          id: "post_1",
          title: "Reported post",
          subtitle: "Pilot",
          preview: "Suspicious content",
          reportCount: 2,
          status: "pending"
        },
        {
          kind: "rating-target-comment",
          id: "comment_1",
          title: "Ranking / Target",
          subtitle: "Another Pilot",
          preview: "Reported comment",
          reportCount: 1,
          status: "visible"
        }
      ]
    });

    expect(payload.items).toHaveLength(2);
    expect(payload.items[1]?.kind).toBe("rating-target-comment");
  });
});
