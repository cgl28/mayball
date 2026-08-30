import { cn } from "@/lib/utils";

export function initialsForName(name: string | null | undefined) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function InitialsAvatar({ name, className }: { name: string | null | undefined; className?: string }) {
  return <span role="img" aria-label={`${name?.trim() || "User"} initials`} title={name?.trim() || "User"} className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-950", className)}>{initialsForName(name)}</span>;
}
