"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  CalendarClock,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Receipt,
  ReceiptText,
  Settings,
  User,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  locked?: boolean;
  lockedLabel?: string;
};

const baseItems: NavItem[] = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/profile", label: "Profile", icon: User },
];

function selectedEventId(pathname: string) {
  const match = pathname.match(/^\/events\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function eventNavItems(eventAccess: EventAccess): NavItem[] {
  const eventId = eventAccess.event.id;
  const capabilities = getEventCapabilities(eventAccess);

  return [
    { href: `/events/${eventId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/events/${eventId}/committee`, label: "Committee", icon: Users },
    { href: `/events/${eventId}/departments`, label: "Departments", icon: Users },
    { href: `/events/${eventId}/budget`, label: "Budget", icon: Banknote },
    { href: `/events/${eventId}/revenue`, label: "Revenue", icon: BarChart3 },
    { href: `/events/${eventId}/finances`, label: "Finances", icon: ReceiptText },
    { href: `/events/${eventId}/requests`, label: "Requests", icon: FileText },
    {
      href: `/events/${eventId}/approvals`,
      label: "Approvals",
      icon: Receipt,
      locked: !capabilities.canManageFinance,
      lockedLabel: "Approvals require the Treasurer role",
    },
    { href: `/events/${eventId}/payments`, label: "Payments", icon: CreditCard },
    { href: `/events/${eventId}/settings/lifecycle`, label: "Lifecycle", icon: CalendarClock },
    { href: `/events/${eventId}/settings`, label: "Settings", icon: Settings },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))]",
        active
          ? "bg-[hsl(var(--marketing-brand-soft))] text-[hsl(var(--marketing-brand-hover))]"
          : item.locked
            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
      )}
      aria-label={item.locked ? `${item.label}. ${item.lockedLabel}` : undefined}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="min-w-0 flex-1">{item.label}</span>
      {item.locked ? (
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
    </Link>
  );
}

function SidebarContents({
  events,
  pathname,
}: {
  events: EventAccess[];
  pathname: string;
}) {
  const eventId = selectedEventId(pathname);
  const currentEvent = eventId ? events.find((eventAccess) => eventAccess.event.id === eventId) : null;

  return (
    <div className="flex h-full flex-col gap-5">
      <Link href="/app" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))]">
        <Image src="/brand/mbf-logo.png" alt="May Ball Finance" width={45} height={30} priority className="h-8 w-auto" />
        <span className="text-base font-semibold tracking-normal text-slate-950">May Ball Finance</span>
      </Link>

      <nav aria-label="Application navigation" className="grid gap-1">
        {baseItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {currentEvent ? (
        <div className="grid gap-3 border-t pt-4">
          <div className="px-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Event</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currentEvent.event.name}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant={currentEvent.isReadOnly ? "secondary" : "default"}>
                {currentEvent.isReadOnly ? "Read-only" : "Active"}
              </Badge>
            </div>
          </div>
          <nav aria-label="Event navigation" className="grid gap-1">
            {eventNavItems(currentEvent).map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>
      ) : null}

      <div className="mt-auto border-t pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppSidebar({ events }: { events: EventAccess[] }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden min-h-svh w-72 border-r bg-white px-4 py-5 lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <SidebarContents events={events} pathname={pathname} />
      </aside>
      <div className="border-b bg-white px-4 py-3 lg:hidden">
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-md border px-3 py-2 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Menu className="h-4 w-4" aria-hidden />
              Navigation
            </span>
          </summary>
          <div className="absolute left-0 right-0 z-40 mt-2 rounded-md border bg-white p-4 shadow-lg">
            <SidebarContents events={events} pathname={pathname} />
          </div>
        </details>
      </div>
    </>
  );
}
