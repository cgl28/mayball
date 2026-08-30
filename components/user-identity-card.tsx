import { InitialsAvatar } from "@/components/initials-avatar";

export function organisationContext(
  organisations: Array<{ id: string; name: string }>,
  preferredOrganisationId: string | null | undefined,
) {
  const preferred = organisations.find((organisation) => organisation.id === preferredOrganisationId);
  if (preferred) return preferred.name;
  if (organisations.length === 1) return organisations[0].name;
  return organisations.length > 1 ? "Multiple organisations" : "No preferred organisation";
}

export function UserIdentityCard({
  name,
  email,
  organisation,
  compact = false,
}: {
  name: string;
  email?: string | null;
  organisation?: string | null;
  compact?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-md border bg-white ${compact ? "p-3" : "p-5 shadow-sm"}`}>
      <InitialsAvatar name={name} className={compact ? "h-8 w-8 text-[11px]" : "h-12 w-12 text-sm"} />
      <div className="min-w-0">
        <p className="truncate font-medium" title={name}>{name}</p>
        {organisation ? <p className="truncate text-sm text-muted-foreground" title={organisation}>{organisation}</p> : null}
        {email ? <p className="truncate text-sm text-muted-foreground" title={email}>{email}</p> : null}
      </div>
    </div>
  );
}
