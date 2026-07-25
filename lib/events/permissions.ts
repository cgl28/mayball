import type { EventAccess, EventRole } from "@/lib/events/access";

export type EventCapabilities = {
  canManageSetup: boolean;
  canManageFinance: boolean;
  isReadOnly: boolean;
  isPresident: boolean;
  isTreasurer: boolean;
};

export function hasRole(roles: EventRole[], role: EventRole) {
  return roles.includes(role);
}

export function getEventCapabilities(eventAccess: EventAccess): EventCapabilities {
  const isPresident = hasRole(eventAccess.roles, "president");
  const isTreasurer = hasRole(eventAccess.roles, "treasurer");

  return {
    canManageSetup: isPresident && !eventAccess.isReadOnly,
    canManageFinance: isTreasurer && !eventAccess.isReadOnly,
    isReadOnly: eventAccess.isReadOnly,
    isPresident,
    isTreasurer,
  };
}
