import { CallToAction, FeatureCard, MarketingSection, PublicPageShell } from "@/components/marketing/public-layout";
import { isMarketingVisitorAuthenticated } from "@/lib/marketing/auth";

const featureGroups = [
  {
    title: "Budget control",
    description: "Track budget versions, department allocations and contingency separately from day-to-day requests.",
    icon: "budget" as const,
  },
  {
    title: "Spending requests",
    description: "Create draft requests, submit them for review and keep requested changes attached to the record.",
    icon: "requests" as const,
  },
  {
    title: "Revenue planning",
    description: "Keep editable forecasts separate from immutable ticket-sales snapshot history.",
    icon: "records" as const,
  },
  {
    title: "Payments",
    description: "Record payments against approved components while preserving reversals and payment-derived completion.",
    icon: "budget" as const,
  },
  {
    title: "Documents",
    description: "Attach quotes, invoices and receipts to the operational record with permission-aware access.",
    icon: "guides" as const,
  },
  {
    title: "Historical records",
    description: "Retain completed events for reference without reopening financial controls.",
    icon: "security" as const,
  },
];

export default async function FeaturesPage() {
  const isAuthenticated = await isMarketingVisitorAuthenticated();

  return (
    <PublicPageShell isAuthenticated={isAuthenticated}>
      <MarketingSection
        eyebrow="Features"
        title="A focused finance system for May Ball committees"
        description="Chiffre joins the core financial workflow without turning committee work into a generic spreadsheet exercise."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureGroups.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </MarketingSection>
      <CallToAction isAuthenticated={isAuthenticated} />
    </PublicPageShell>
  );
}
