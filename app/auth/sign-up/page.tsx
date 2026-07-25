import { BackButton } from "@/components/back-button";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <BackButton />
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
