import { CallToAction, MarketingSection, PublicPageShell, RoleCard } from "@/components/marketing/public-layout";
import { isMarketingVisitorAuthenticated } from "@/lib/marketing/auth";

export default async function AboutPage() {
  const isAuthenticated = await isMarketingVisitorAuthenticated();

  return (
    <PublicPageShell isAuthenticated={isAuthenticated}>
      <MarketingSection
        eyebrow="About"
        title="Built for the realities of May Ball finance"
        description="Chiffre is a working application for committee-run events where budgets, spending control, payment tracking and yearly handover all matter."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <RoleCard role="Clear control" description="Treasurer powers stay separate from broader event administration." />
          <RoleCard role="Shared context" description="Committee members work from the same event record rather than scattered documents." />
          <RoleCard role="Historical continuity" description="Completed events remain available as read-only references for future committees." />
        </div>
      </MarketingSection>
      <CallToAction isAuthenticated={isAuthenticated} />
    </PublicPageShell>
  );
}
