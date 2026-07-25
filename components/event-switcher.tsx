"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, CalendarDays, Circle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type EventAccess,
  isHistoricalStatus,
  summarizeRoles,
} from "@/lib/events/access";

export function EventSwitcher({ events }: { events: EventAccess[] }) {
  const pathname = usePathname();

  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No accessible events.
      </p>
    );
  }

  return (
    <nav aria-label="Event switcher" className="grid gap-2">
      {events.map(({ event, organisation, roles, isReadOnly }) => {
        const href = `/events/${event.id}`;
        const isCurrent = pathname === href;

        return (
          <Link
            key={event.id}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "rounded-md border p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isCurrent
                ? "border-foreground bg-accent text-accent-foreground"
                : "hover:bg-accent",
            )}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="grid gap-1">
                <span className="font-medium leading-tight">{event.name}</span>
                <span className="text-xs text-muted-foreground">
                  {organisation?.name ?? "Organisation unavailable"}
                </span>
              </span>
              {isReadOnly ? (
                <Lock aria-label="Read-only event" className="mt-0.5 h-4 w-4" />
              ) : (
                <Circle aria-label="Active event" className="mt-1 h-3 w-3 fill-current" />
              )}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="gap-1">
                {isHistoricalStatus(event.status) ? (
                  <Archive className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                )}
                {event.event_year}
              </Badge>
              <Badge variant={isReadOnly ? "secondary" : "default"}>
                {isReadOnly ? "Read-only" : "Active"}
              </Badge>
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {summarizeRoles(roles)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
