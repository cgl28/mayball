const INVITATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export type InvitationInputParseResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

function normaliseToken(token: string) {
  return token.trim().toLowerCase();
}

function tokenResult(token: string): InvitationInputParseResult {
  const normalised = normaliseToken(token);

  if (!INVITATION_TOKEN_PATTERN.test(normalised)) {
    return {
      ok: false,
      error: "Enter a valid Chiffre invitation link.",
    };
  }

  return { ok: true, token: normalised };
}

function tokenFromPathname(pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);

  if (segments.length !== 2 || segments[0] !== "invitations") {
    return null;
  }

  return segments[1];
}

export function parseInvitationInput(
  input: string | null | undefined,
): InvitationInputParseResult {
  const value = input?.trim() ?? "";

  if (!value) {
    return {
      ok: false,
      error: "Enter a valid Chiffre invitation link.",
    };
  }

  if (INVITATION_TOKEN_PATTERN.test(value)) {
    return tokenResult(value);
  }

  if (value.startsWith("/")) {
    const token = tokenFromPathname(value);
    return token ? tokenResult(token) : {
      ok: false,
      error: "Enter a valid Chiffre invitation link.",
    };
  }

  try {
    const url = new URL(value);
    const token = tokenFromPathname(url.pathname);
    return token ? tokenResult(token) : {
      ok: false,
      error: "Enter a valid Chiffre invitation link.",
    };
  } catch {
    return {
      ok: false,
      error: "Enter a valid Chiffre invitation link.",
    };
  }
}

export function invitationPathForToken(token: string) {
  const parsed = tokenResult(token);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return `/invitations/${parsed.token}`;
}
