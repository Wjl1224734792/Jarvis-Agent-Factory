import { describe, expect, it } from "vitest";
import { buildBrandApplicationSuccessView } from "../src/routes/publish-brand-page-helpers";

describe("publish brand page helpers", () => {
  it("returns pending review copy for a fresh submission", () => {
    expect(
      buildBrandApplicationSuccessView({
        id: "brand_app_1",
        name: "E2E Brand",
        status: "pending"
      })
    ).toMatchObject({
      eyebrow: "待审核",
      title: "品牌申请已提交",
      statusLabel: "待审核",
      primaryActionLabel: "返回首页",
      secondaryActionLabel: "返回飞行器投稿"
    });
  });

  it("keeps the same review copy after editing and resubmitting", () => {
    expect(
      buildBrandApplicationSuccessView({
        id: "brand_app_2",
        name: "Resubmitted Brand",
        status: "rejected"
      })
    ).toMatchObject({
      eyebrow: "待审核",
      title: "品牌申请已提交",
      statusLabel: "待审核"
    });
  });
});
