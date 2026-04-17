/** Binds global API error toasts without a circular import with httpClient. */
let notifyError = () => {};

export function registerGlobalErrorToast(handler) {
  notifyError = typeof handler === "function" ? handler : () => {};
}

export function notifyGlobalApiError(message) {
  if (message) {
    notifyError(String(message));
  }
}

/** Same channel as API errors: client-side validation, OpenCV, etc. */
export function notifyUserError(message) {
  notifyGlobalApiError(message);
}
