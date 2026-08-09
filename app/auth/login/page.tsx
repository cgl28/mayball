import { BackButton } from "@/components/back-button";
import { LoginForm } from "@/components/login-form";
import { sanitizeReturnPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
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
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="mb-6 flex justify-center">
          <Image src="/brand/mbf-logo.png" alt="May Ball Finance" width={72} height={48} priority className="h-12 w-auto" />
        </div>
        <LoginForm returnTo={returnTo} />
      </div>
    </div>
  );
}
