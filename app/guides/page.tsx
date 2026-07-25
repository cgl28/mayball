import { CallToAction, FeatureCard, MarketingSection, PublicPageShell } from "@/components/marketing/public-layout";
import { isMarketingVisitorAuthenticated } from "@/lib/marketing/auth";

export default async function GuidesPage() {
  const isAuthenticated = await isMarketingVisitorAuthenticated();

  return (
    <PublicPageShell isAuthenticated={isAuthenticated}>
      <MarketingSection
        eyebrow="Guides"
        title="Short guides for committee finance work"
        description="This area will collect practical onboarding notes for presidents, treasurers and committee members. The initial structure keeps the public site ready for those guides."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard title="For presidents" description="How to set up an event, departments and committee access." icon="roles" />
          <FeatureCard title="For treasurers" description="How budgets, approvals, payments and exports fit together." icon="budget" />
          <FeatureCard title="For committee members" description="How to draft requests and understand status changes." icon="requests" />
        </div>
      </MarketingSection>
      <MarketingSection
        eyebrow="Security"
        title="Privacy and security placeholder"
        description="Detailed privacy, security and data-handling information will be published here as the product moves from working draft to production readiness."
      />
      <CallToAction isAuthenticated={isAuthenticated} />
    </PublicPageShell>
  );
}
