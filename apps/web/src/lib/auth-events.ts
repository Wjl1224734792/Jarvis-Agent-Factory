export const WEB_AUTH_INVALID_EVENT = "feijia:web-auth-invalid";

export function dispatchWebAuthInvalidEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(WEB_AUTH_INVALID_EVENT));
}
