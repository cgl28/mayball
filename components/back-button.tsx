import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  return (
    <Button asChild variant="ghost" className="text-slate-700 hover:bg-slate-100 hover:text-slate-950">
      <Link href="/">
        <Home className="h-4 w-4" aria-hidden="true" />
        Home
      </Link>
    </Button>
  );
}
