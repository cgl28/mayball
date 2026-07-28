export function friendlyInvitationError(message: string) {
  if (/expired/i.test(message)) {
    return "This invitation has expired. Ask the event president to create a new one.";
  }
  if (/not pending/i.test(message)) {
    return "This invitation is no longer valid.";
  }
  if (/email does not match/i.test(message)) {
    return "This invitation was issued to a different email address. Sign in with the invited account or ask the president to issue a new invitation.";
  }
  if (/invalid|not found|no rows/i.test(message)) {
    return "This invitation could not be found.";
  }
  if (/not accepting invitations/i.test(message)) {
    return "This event is not accepting invitations.";
  }

  return "The invitation could not be validated.";
}
