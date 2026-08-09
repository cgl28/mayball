"use client";

import { useEffect, useId, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaymentUrgencyDialog() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        aria-label="Payment urgency definitions"
        onClick={() => setOpen(true)}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-md border bg-white p-5 text-sm shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id={titleId} className="font-medium text-foreground">Payment urgency</h3>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Close payment urgency help" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <dl className="mt-3 grid gap-2">
              <div><dt className="font-medium">Overdue</dt><dd className="text-muted-foreground">Past its due date and still has an outstanding balance.</dd></div>
              <div><dt className="font-medium">Due soon</dt><dd className="text-muted-foreground">Due within the next 14 days and still has an outstanding balance.</dd></div>
              <div><dt className="font-medium">Future</dt><dd className="text-muted-foreground">Due more than 14 days from now and still has an outstanding balance.</dd></div>
              <div><dt className="font-medium">No due date</dt><dd className="text-muted-foreground">Outstanding, but neither the component nor the event has a due date.</dd></div>
              <div><dt className="font-medium">Paid</dt><dd className="text-muted-foreground">No outstanding balance remains.</dd></div>
            </dl>
            <p className="mt-3 text-muted-foreground">
              If a component has no explicit due date, the event date is used. Partial payment does not remove overdue or due-soon urgency while money remains outstanding.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
