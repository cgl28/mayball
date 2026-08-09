import { BackButton } from "@/components/back-button";
import { SignUpForm } from "@/components/sign-up-form";
import Image from "next/image";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="mb-6 flex justify-center">
          <Image src="/brand/mbf-logo.png" alt="May Ball Finance" width={72} height={48} priority className="h-12 w-auto" />
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
