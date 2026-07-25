import Link from "next/link";
import { AlertTriangle, Archive, BarChart3, CalendarDays, CreditCard, Download, FileText, History, ReceiptText, Scale, Settings, TrendingUp, Users, WalletCards, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventAccess } from "@/lib/events/access";
import { isHistoricalStatus, summarizeRoles } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function EventLanding({ eventAccess }: { eventAccess: EventAccess }) {
  const { event, organisation, roles, accessMode, isReadOnly } = eventAccess;
  const capabilities = getEventCapabilities(eventAccess);

  return (
    <div className="grid gap-6">
      {isReadOnly ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-medium">Read-only historical event</h2>
            <p className="mt-1 text-sm">
              This event is retained for historical reference. Creation and
              editing controls are not available here.
            </p>
          </div>
        </div>
      ) : null}

      <section className="rounded-md border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {organisation?.name ?? "Organisation unavailable"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              {event.name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              {isHistoricalStatus(event.status) ? (
                <Archive className="h-3 w-3" aria-hidden="true" />
              ) : (
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
              )}
              {statusLabel(event.status)}
            </Badge>
            <Badge variant={isReadOnly ? "secondary" : "default"}>
              {isReadOnly ? "Read-only" : "Editable shell"}
            </Badge>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Event code</dt>
            <dd>{event.code}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Event year</dt>
            <dd>{event.event_year}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Access</dt>
            <dd>
              {accessMode === "historical"
                ? "Historical/read-only"
                : "Active event membership"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Your roles</dt>
            <dd>{summarizeRoles(roles)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md border border-dashed p-6">
        <h2 className="font-medium">Event setup</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Use the event modules for setup, budgets, revenue, spending requests,
          approvals, payment tracking, documents, activity and CSV exports.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/dashboard`}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/settings`}>
              <Settings className="h-4 w-4" aria-hidden="true" />
              Settings
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/departments`}>
              <Workflow className="h-4 w-4" aria-hidden="true" />
              Departments
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/committee`}>
              <Users className="h-4 w-4" aria-hidden="true" />
              Committee
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/budget`}>
              <WalletCards className="h-4 w-4" aria-hidden="true" />
              Budget
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/revenue`}>
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Revenue
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/requests`}>
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              Spending requests
            </Link>
          </Button>
          {capabilities.canManageFinance ? (
            <Button asChild variant="outline">
              <Link href={`/events/${event.id}/approvals`}>
                <Scale className="h-4 w-4" aria-hidden="true" />
                Approvals
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/payments`}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Payments
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/documents`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Documents
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/activity`}>
              <History className="h-4 w-4" aria-hidden="true" />
              Activity
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}/exports`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exports
            </Link>
          </Button>
          {capabilities.canManageSetup ? (
            <Button asChild variant="outline">
              <Link href="/events/new">Create recurring event</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/events">Back to event selection</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
