import type { EventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export type LockedPageDetails = {
  title: string;
  description: string;
  requiredRole: string;
  backHref: string;
};

export function getApprovalsPageLock(
  eventAccess: EventAccess,
): LockedPageDetails | null {
  const capabilities = getEventCapabilities(eventAccess);

  if (capabilities.canManageFinance) {
    return null;
  }

  return {
    title: "Approvals are locked",
    description:
      "This event exists and you can view it, but approval queues are available to event treasurers only.",
    requiredRole: "Treasurer",
    backHref: `/events/${eventAccess.event.id}/dashboard`,
  };
}

export function getApprovalReviewPageLock(
  eventAccess: EventAccess,
): LockedPageDetails | null {
  const capabilities = getEventCapabilities(eventAccess);

  if (capabilities.canManageFinance) {
    return null;
  }

  return {
    title: "Approval review is locked",
    description:
      "This event exists and you can view it, but individual approval reviews are available to event treasurers only.",
    requiredRole: "Treasurer",
    backHref: `/events/${eventAccess.event.id}/dashboard`,
  };
}
