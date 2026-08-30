import Link from "next/link";
import { BarChart3, BookOpen, CheckCircle2, FileText, LockKeyhole, Menu, ShieldCheck, Users } from "lucide-react";
import { ChiffreWordmark } from "@/components/chiffre-wordmark";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
];

export const marketingStyles = {
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] focus-visible:ring-offset-2",
  brandText: "text-[hsl(var(--marketing-brand))]",
  brandTextHover: "hover:text-[hsl(var(--marketing-brand-hover))]",
  brandBg: "bg-[hsl(var(--marketing-brand))]",
  brandBgHover: "hover:bg-[hsl(var(--marketing-brand-hover))]",
  brandSoftBg: "bg-[hsl(var(--marketing-brand-soft))]",
  brandBorder: "border-[hsl(var(--marketing-border))]",
  primaryButton: "bg-[hsl(var(--marketing-brand))] text-[hsl(var(--marketing-brand-foreground))] shadow hover:bg-[hsl(var(--marketing-brand-hover))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] focus-visible:ring-offset-2",
  secondaryButton: "border border-[hsl(var(--marketing-border))] bg-white text-[hsl(var(--marketing-brand-hover))] shadow-sm hover:bg-[hsl(var(--marketing-brand-soft))] hover:text-[hsl(var(--marketing-brand-hover))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] focus-visible:ring-offset-2",
  invertedSecondaryButton: "border border-white bg-transparent text-white hover:bg-white hover:text-[hsl(var(--marketing-brand-hover))] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--marketing-brand-hover))]",
};

export type MarketingFeature = {
  title: string;
  description: string;
  icon?: "budget" | "requests" | "records" | "security" | "roles" | "guides";
};

function iconFor(icon: MarketingFeature["icon"]) {
  const className = `h-5 w-5 ${marketingStyles.brandText}`;
  if (icon === "requests") return <FileText className={className} aria-hidden="true" />;
  if (icon === "records") return <BookOpen className={className} aria-hidden="true" />;
  if (icon === "security") return <ShieldCheck className={className} aria-hidden="true" />;
  if (icon === "roles") return <Users className={className} aria-hidden="true" />;
  if (icon === "guides") return <CheckCircle2 className={className} aria-hidden="true" />;
  return <BarChart3 className={className} aria-hidden="true" />;
}

export function PublicHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Chiffre home" className={`rounded-md ${marketingStyles.focus}`}>
          <ChiffreWordmark className="w-36 sm:w-40" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-md underline-offset-4 hover:underline ${marketingStyles.brandTextHover} ${marketingStyles.focus}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button asChild className={marketingStyles.primaryButton}>
              <Link href="/events">Open App</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" className={marketingStyles.secondaryButton}>
                <Link href="/auth/login">Log In</Link>
              </Button>
              <Button asChild className={marketingStyles.primaryButton}>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <details className="group relative md:hidden">
          <summary className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border text-slate-800 transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden ${marketingStyles.focus}`}>
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Open navigation menu</span>
          </summary>
          <div className="absolute right-0 mt-3 w-64 rounded-md border bg-white p-3 shadow-lg">
            <nav className="grid gap-1 text-sm font-medium" aria-label="Mobile navigation">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className={`rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50 ${marketingStyles.brandTextHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))]`}>
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t" />
              {isAuthenticated ? (
                <Link href="/events" className={`rounded-md px-3 py-2 text-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] ${marketingStyles.brandBg} ${marketingStyles.brandBgHover}`}>
                  Open App
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className={`rounded-md px-3 py-2 text-[hsl(var(--marketing-brand-hover))] hover:bg-[hsl(var(--marketing-brand-soft))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))]`}>
                    Log In
                  </Link>
                  <Link href="/auth/sign-up" className={`rounded-md px-3 py-2 text-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] ${marketingStyles.brandBg} ${marketingStyles.brandBgHover}`}>
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <ChiffreWordmark className="w-40" inverted />
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Collaborative budgeting and expenditure control for recurring student events.
          </p>
        </div>
        <nav className="grid gap-2 text-sm" aria-label="Footer pages">
          <p className="font-medium text-white">Product</p>
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="text-slate-300 underline-offset-4 hover:text-white hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <nav className="grid gap-2 text-sm" aria-label="Footer account links">
          <p className="font-medium text-white">Access</p>
          <Link href="/auth/login" className="text-slate-300 underline-offset-4 hover:text-white hover:underline">Log In</Link>
          <Link href="/auth/sign-up" className="text-slate-300 underline-offset-4 hover:text-white hover:underline">Get Started</Link>
          <Link href="/guides#security" className="text-slate-300 underline-offset-4 hover:text-white hover:underline">Privacy and Security</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
        © {year} Chiffre. All rights reserved.
      </div>
    </footer>
  );
}

export function PublicPageShell({ children, isAuthenticated = false }: { children: React.ReactNode; isAuthenticated?: boolean }) {
  return (
    <div className="min-h-svh bg-white text-slate-950">
      <PublicHeader isAuthenticated={isAuthenticated} />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

export function MarketingSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {eyebrow ? <p className={`text-sm font-semibold uppercase tracking-wide ${marketingStyles.brandText}`}>{eyebrow}</p> : null}
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{title}</h2>
          {description ? <p className="mt-4 text-base leading-7 text-slate-600">{description}</p> : null}
        </div>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

export function FeatureCard({ title, description, icon }: MarketingFeature) {
  return (
    <article className="rounded-md border bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${marketingStyles.brandSoftBg}`}>
        {iconFor(icon)}
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-normal text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

export function RoleCard({ role, description }: { role: string; description: string }) {
  return (
    <article className={`rounded-md border p-5 ${marketingStyles.brandBorder} ${marketingStyles.brandSoftBg}`}>
      <h3 className="text-lg font-semibold tracking-normal text-[hsl(var(--marketing-brand-hover))]">{role}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
    </article>
  );
}

export function WorkflowSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-6">
      {steps.map((step, index) => (
        <li key={step} className="rounded-md border bg-white p-4 text-sm shadow-sm">
          <span className={`text-xs font-semibold ${marketingStyles.brandText}`}>Step {index + 1}</span>
          <p className="mt-2 font-medium text-slate-950">{step}</p>
        </li>
      ))}
    </ol>
  );
}

export function CallToAction({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <section className="bg-[hsl(var(--marketing-brand-hover))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 text-white sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-normal">Ready to bring the finance plan into one place?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
            Start with event setup, then add budgets, requests, approvals and payment records as your committee work develops.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAuthenticated ? (
            <Button asChild variant="secondary" className="bg-white text-[hsl(var(--marketing-brand-hover))] hover:bg-[hsl(var(--marketing-brand-soft))]">
              <Link href="/events">Open App</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="secondary" className="bg-white text-[hsl(var(--marketing-brand-hover))] hover:bg-[hsl(var(--marketing-brand-soft))]">
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
              <Button asChild variant="outline" className={marketingStyles.invertedSecondaryButton}>
                <Link href="/auth/login">Log In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function SecurityNote() {
  return (
    <div className={`rounded-md border p-5 ${marketingStyles.brandBorder} ${marketingStyles.brandSoftBg}`}>
      <div className="flex gap-3">
        <LockKeyhole className={`mt-1 h-5 w-5 ${marketingStyles.brandText}`} aria-hidden="true" />
        <div>
          <h3 className="font-semibold tracking-normal text-[hsl(var(--marketing-brand-hover))]">Permission-aware by design</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Presidents, treasurers and committee members see the areas relevant to their role, while completed events remain available for historical reference.
          </p>
        </div>
      </div>
    </div>
  );
}
