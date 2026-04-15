import { adminReportRecordsResponseSchema } from "@feijia/schemas";

export function buildAdminReportEvidenceImages(
  reportId: string,
  urls: readonly string[]
) {
  return urls.map((url, index) => ({
    id: `${reportId}-${index}`,
    url,
    fileName: `report-${index + 1}.png`,
    mimeType: "image/png",
    byteSize: 0
  }));
}

export function parseAdminReportRecordsResponse(payload: unknown) {
  return adminReportRecordsResponseSchema.parse(payload);
}
