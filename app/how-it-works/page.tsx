import { CallToAction, MarketingSection, PublicPageShell, WorkflowSteps } from "@/components/marketing/public-layout";
import { isMarketingVisitorAuthenticated } from "@/lib/marketing/auth";

export default async function HowItWorksPage() {
  const isAuthenticated = await isMarketingVisitorAuthenticated();

  return (
    <PublicPageShell isAuthenticated={isAuthenticated}>
      <MarketingSection
        eyebrow="How it works"
        title="One event finance workflow from setup to close"
        description="The product follows the way recurring events are actually run: setup the committee, agree the budget, control requests, record payment and keep the final history."
      >
        <WorkflowSteps steps={["Set up event", "Forecast revenue", "Activate budget", "Submit requests", "Approve and pay", "Complete event"]} />
      </MarketingSection>
      <MarketingSection
        title="Designed for handover"
        description="Each event stands on its own, while previous completed events remain available for comparison and committee continuity."
      />
      <CallToAction isAuthenticated={isAuthenticated} />
    </PublicPageShell>
  );
}
