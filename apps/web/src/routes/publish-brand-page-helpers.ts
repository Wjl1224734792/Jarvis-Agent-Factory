import type { BrandApplication } from "@feijia/schemas";

export type BrandApplicationSuccessView = {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

export function buildBrandApplicationSuccessView(
  application: Pick<BrandApplication, "id" | "name" | "status">
): BrandApplicationSuccessView {
  return {
    eyebrow: "待审核",
    title: "品牌申请已提交",
    description: `${application.name} 已进入审核队列，审核通过前不会进入公开品牌列表。`,
    statusLabel: application.status === "pending" ? "待审核" : "待审核",
    primaryActionLabel: "返回首页",
    secondaryActionLabel: "返回飞行器投稿"
  };
}
