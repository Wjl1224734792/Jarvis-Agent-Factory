import { describe, expect, it } from "vitest";
import {
  buildAdminReportEvidenceImages,
  parseAdminReportRecordsResponse
} from "../src/modules/admin-reports/admin-reports.helpers";

describe("admin reports helpers", () => {
  it("builds schema-complete evidence images for admin report records", () => {
    const payload = parseAdminReportRecordsResponse({
      items: [
        {
          id: "report_1",
          reason: "需要管理员核查",
          createdAt: "2026-04-15T12:00:00.000Z",
          reporter: {
            id: "user_1",
            displayName: "Pilot",
            avatarUrl: null,
            role: "user"
          },
          evidenceImages: buildAdminReportEvidenceImages("report_1", [
            "https://cdn.example.com/report-1.png"
          ])
        }
      ]
    });

    expect(payload.items[0]?.evidenceImages[0]).toMatchObject({
      fileName: "report-1.png",
      mimeType: "image/png",
      byteSize: 0
    });
  });
});
