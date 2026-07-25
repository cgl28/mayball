import { redirect } from "next/navigation";

export default function LoginShortcutPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  const returnTo = searchParams?.returnTo ? `?returnTo=${encodeURIComponent(searchParams.returnTo)}` : "";
  redirect(`/auth/login${returnTo}`);
}
