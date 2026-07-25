"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  function handleBack() {
    const hasSameOriginReferrer =
      typeof document !== "undefined" &&
      typeof window !== "undefined" &&
      document.referrer.startsWith(window.location.origin);

    if (hasSameOriginReferrer && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <Button type="button" variant="ghost" onClick={handleBack} className="text-slate-700 hover:bg-slate-100 hover:text-slate-950">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </Button>
  );
}
