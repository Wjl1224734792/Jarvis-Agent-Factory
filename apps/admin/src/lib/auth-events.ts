export const ADMIN_AUTH_INVALID_EVENT = "feijia:admin-auth-invalid";

export function dispatchAdminAuthInvalidEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(ADMIN_AUTH_INVALID_EVENT));
}
