import { LoginForm } from "@/components/login-form";
import { sanitizeReturnPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const returnTo = sanitizeReturnPath(params?.returnTo);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(returnTo);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm returnTo={returnTo} />
      </div>
    </div>
  );
}
