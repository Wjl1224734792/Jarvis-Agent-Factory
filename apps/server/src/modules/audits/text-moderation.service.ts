// TODO: stub - implement text moderation evaluation
export async function evaluateTextModeration(_input: {
  mode: string;
  domain: string;
  entityId: string;
  text: string;
}) {
  return { action: "approve" as "approve" | "manual_review" | "reject" };
}
