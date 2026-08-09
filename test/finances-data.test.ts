import { describe, expect, it, vi } from "vitest";
import { getFinancesData } from "@/lib/finances/data";
import type { Database } from "@/src/types/database.generated";
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryRecord = {
  table: string;
  filters: Array<{ method: string; column: string; value: unknown }>;
};

function createQuery(table: string, data: unknown[], records: QueryRecord[]) {
  const record: QueryRecord = { table, filters: [] };
  records.push(record);

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ method: "eq", column, value });
      return query;
    }),
    order: vi.fn(() => query),
    in: vi.fn(() => {
      throw new Error("Allocation queries must not use large revision-id filters.");
    }),
    then: (resolve: (result: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };

  return query;
}

describe("getFinancesData", () => {
  it("loads department allocations by selected event department instead of all revision ids", async () => {
    const records: QueryRecord[] = [];
    const tableData: Record<string, unknown[]> = {
      v_event_department_financial_positions: [
        {
          event_id: "event-id",
          department_id: "dep-food",
          department_name: "Food",
          department_code: "FOOD",
          display_order: 1,
          has_active_allocation: true,
          current_budget_minor: 20000,
          approved_net_minor: 10000,
          pending_net_minor: 0,
        },
      ],
      v_spending_request_current_revisions: [
        {
          request_id: "request-1",
          revision_id: "revision-1",
          code: "DMB_FOOD_1",
          title: "Dinner",
          supplier_name: "Supplier",
          owner_preferred_name: "Alex",
          owner_display_name: null,
          approval_status: "approved",
          revision_status: "submitted",
          vat_recoverable: true,
          revision_updated_at: "2027-01-01T00:00:00Z",
          request_updated_at: "2027-01-01T00:00:00Z",
        },
      ],
      v_request_payment_positions: [
        {
          request_id: "request-1",
          approved_net_minor: 10000,
          approved_gross_minor: 12000,
          paid_gross_minor: 6000,
          payment_status: "partially_paid",
        },
      ],
      spending_request_department_allocations: [
        {
          department_id: "dep-food",
          revision_id: "revision-1",
          net_minor: 10000,
          vat_minor: 2000,
          gross_minor: 12000,
        },
      ],
    };

    const supabase = {
      from: vi.fn((table: string) => createQuery(table, tableData[table] ?? [], records)),
    } as unknown as SupabaseClient<Database>;

    const result = await getFinancesData(supabase, "event-id");

    expect(result.error).toBeNull();
    expect(result.data?.requests).toHaveLength(1);
    expect(result.data?.wholeEvent.approvedPaidNetMinor).toBe(5000);
    expect(result.data?.wholeEvent.approvedUnpaidNetMinor).toBe(5000);
    expect(result.data?.totals.approvedPaidNetMinor).toBe(5000);
    expect(result.data?.totals.approvedUnpaidNetMinor).toBe(5000);

    const allocationQuery = records.find(
      (record) => record.table === "spending_request_department_allocations",
    );
    expect(allocationQuery?.filters).toEqual([
      { method: "eq", column: "event_id", value: "event-id" },
      { method: "eq", column: "department_id", value: "dep-food" },
    ]);
  });
});
