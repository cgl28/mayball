const DEFAULT_AUTHENTICATED_PATH = "/events";
const LOGIN_PATH = "/auth/login";

export function sanitizeReturnPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.startsWith(`${LOGIN_PATH}?`) || value === LOGIN_PATH) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://mayball.local");
    if (parsed.origin !== "http://mayball.local") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPathForReturnTo(pathname: string, search = "") {
  const returnTo = sanitizeReturnPath(`${pathname}${search}`);
  return `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}

export { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH };
