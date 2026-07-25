import Link from "next/link";
import { BarChart3, CalendarClock, ShieldCheck } from "lucide-react";
import {
  CallToAction,
  FeatureCard,
  MarketingSection,
  PublicPageShell,
  RoleCard,
  SecurityNote,
  WorkflowSteps,
  marketingStyles,
} from "@/components/marketing/public-layout";
import { Button } from "@/components/ui/button";
import { isMarketingVisitorAuthenticated } from "@/lib/marketing/auth";

const features = [
  {
    title: "Budgets and contingency",
    description: "Keep department budgets, approved spending and contingency movements in the same operating picture.",
    icon: "budget" as const,
  },
  {
    title: "Requests and approvals",
    description: "Committee members draft requests, treasurers review decisions, and the audit trail stays attached.",
    icon: "requests" as const,
  },
  {
    title: "Payments and records",
    description: "Payment status is tracked separately from approval, with historical event records retained.",
    icon: "records" as const,
  },
];

export default async function Home() {
  const isAuthenticated = await isMarketingVisitorAuthenticated();

  return (
    <PublicPageShell isAuthenticated={isAuthenticated}>
      <section className="bg-[hsl(var(--marketing-surface))]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center lg:px-8 lg:py-20">
          <div>
            <p className={`text-sm font-semibold uppercase tracking-wide ${marketingStyles.brandText}`}>Modern finance control for recurring events</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              Plan, approve and track your May Ball finances in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              May Ball Finance gives presidents, treasurers and committee members one shared system for budgets, spending requests, approvals, payments and historical records.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Button asChild size="lg" className={marketingStyles.primaryButton}>
                  <Link href="/events">Open App</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className={marketingStyles.primaryButton}>
                    <Link href="/auth/sign-up">Get Started</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className={marketingStyles.secondaryButton}>
                    <Link href="/auth/login">Log In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="rounded-md border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-medium text-slate-950">Downing May Ball 2027</p>
                <p className="text-xs text-slate-500">Planning view</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-medium text-[hsl(var(--marketing-brand-hover))] ${marketingStyles.brandSoftBg}`}>Treasurer</span>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Forecast revenue", "£247,500"],
                ["Approved spending", "£10,800"],
                ["Unallocated contingency", "£15,000"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-md border bg-slate-50 p-4">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-950">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className={`rounded-md p-4 text-white ${marketingStyles.brandBg}`}>
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">Budget</p>
              </div>
              <div className="rounded-md bg-slate-100 p-4 text-slate-900">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">Approve</p>
              </div>
              <div className="rounded-md bg-slate-100 p-4 text-slate-900">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">Reconcile</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingSection
        eyebrow="Core workflow"
        title="From early forecasts to final reconciliation"
        description="A single workflow keeps planning assumptions, committee requests, treasurer approval and payment records connected."
      >
        <WorkflowSteps steps={["Forecast", "Budget", "Request", "Approve", "Pay", "Reconcile"]} />
      </MarketingSection>

      <MarketingSection
        eyebrow="Roles"
        title="Built around the committee structure"
        description="Each role gets a focused view of the work they need to do without blurring financial control."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <RoleCard role="President" description="Set up the event, manage committee structure and keep the operating model clear." />
          <RoleCard role="Treasurer" description="Control budgets, approvals, payments and the financial record for the event." />
          <RoleCard role="Committee" description="Draft spending requests and follow the status of the work relevant to the event." />
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="Features"
        title="The main finance modules in one system"
        description="The first product surface focuses on the recurring May Ball finance lifecycle."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="History"
        title="Keep completed events available without reopening them"
        description="Historical records remain useful for handover and comparison, while completed events stay read-only."
      >
        <SecurityNote />
      </MarketingSection>

      <MarketingSection
        eyebrow="Security"
        title="Designed for permission-aware committee work"
        description="Public pages never render private event or organisation data. The application uses authenticated routes for operational records."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard title="Authenticated app" description="Operational event pages remain behind the existing login flow." icon="security" />
          <FeatureCard title="Role-specific controls" description="Presidents, treasurers and ordinary members have distinct responsibilities." icon="roles" />
          <FeatureCard title="Audit-friendly records" description="Requests, approvals, payments and documents keep their history attached." icon="records" />
        </div>
      </MarketingSection>

      <CallToAction isAuthenticated={isAuthenticated} />
    </PublicPageShell>
  );
}
