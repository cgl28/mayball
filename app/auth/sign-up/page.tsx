import { BackButton } from "@/components/back-button";
import { ChiffreWordmark } from "@/components/chiffre-wordmark";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="mb-6 flex justify-center">
          <ChiffreWordmark className="w-48" priority />
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
