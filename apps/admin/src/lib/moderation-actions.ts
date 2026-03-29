export function promptRejectionReason(message = "请输入驳回原因") {
  const reason = window.prompt(message, "");
  const trimmed = reason?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
