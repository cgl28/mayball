import { describe, expect, it } from "vitest";

import { classifyPaymentUrgency, resolveEffectiveDueDate, summariseWorkload } from "@/lib/payments/data";

describe("payment workload data helpers", () => {
  it("classifies overdue, due-soon, future, no-date and paid component states", () => {
    expect(classifyPaymentUrgency({ expected_payment_date: "2027-01-01", outstanding_gross_minor: 100 }, "2027-01-10", "2027-01-24")).toBe("overdue");
    expect(classifyPaymentUrgency({ expected_payment_date: "2027-01-20", outstanding_gross_minor: 100 }, "2027-01-10", "2027-01-24")).toBe("due_soon");
    expect(classifyPaymentUrgency({ expected_payment_date: "2027-02-01", outstanding_gross_minor: 100 }, "2027-01-10", "2027-01-24")).toBe("future");
    expect(classifyPaymentUrgency({ expected_payment_date: null, outstanding_gross_minor: 100 }, "2027-01-10", "2027-01-24")).toBe("no_due_date");
    expect(classifyPaymentUrgency({ expected_payment_date: null, outstanding_gross_minor: 100 }, "2027-01-10", "2027-01-24", "2027-01-20")).toBe("due_soon");
    expect(classifyPaymentUrgency({ expected_payment_date: "2027-01-01", outstanding_gross_minor: 0 }, "2027-01-10", "2027-01-24")).toBe("paid");
  });

  it("resolves effective due dates from component dates before event dates", () => {
    expect(resolveEffectiveDueDate({ expected_payment_date: "2027-02-01" }, "2027-01-20")).toEqual({
      effective_due_date: "2027-02-01",
      due_date_source: "component",
    });
    expect(resolveEffectiveDueDate({ expected_payment_date: null }, "2027-01-20")).toEqual({
      effective_due_date: "2027-01-20",
      due_date_source: "event",
    });
    expect(resolveEffectiveDueDate({ expected_payment_date: null }, null)).toEqual({
      effective_due_date: null,
      due_date_source: "none",
    });
  });

  it("summarises approved, paid, outstanding, overdue and due-soon gross values", () => {
    const summary = summariseWorkload(
      [
        { approved_gross_minor: 1000, paid_gross_minor: 0, outstanding_gross_minor: 1000, expected_payment_date: "2027-01-01" },
        { approved_gross_minor: 2000, paid_gross_minor: 500, outstanding_gross_minor: 1500, expected_payment_date: "2027-01-20" },
        { approved_gross_minor: 3000, paid_gross_minor: 3000, outstanding_gross_minor: 0, expected_payment_date: "2027-01-01" },
        { approved_gross_minor: 4000, paid_gross_minor: 0, outstanding_gross_minor: 4000, expected_payment_date: null },
      ],
      "2027-01-10",
      "2027-01-24",
    );

    expect(summary).toEqual({
      approvedGrossMinor: 10000,
      paidGrossMinor: 3500,
      outstandingGrossMinor: 6500,
      futureOutstandingGrossMinor: 4000,
      overdueGrossMinor: 1000,
      dueSoonGrossMinor: 1500,
      noDueDateCount: 1,
      approvedComponentCount: 4,
    });
  });

  it("uses event-date fallback when summarising components without explicit due dates", () => {
    const summary = summariseWorkload(
      [
        { approved_gross_minor: 4000, paid_gross_minor: 0, outstanding_gross_minor: 4000, expected_payment_date: null },
      ],
      "2027-01-10",
      "2027-01-24",
      "2027-01-20",
    );

    expect(summary.futureOutstandingGrossMinor).toBe(0);
    expect(summary.dueSoonGrossMinor).toBe(4000);
    expect(summary.noDueDateCount).toBe(0);
  });
});
