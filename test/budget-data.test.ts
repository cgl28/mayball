import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBudgetOverview } from "@/lib/budget/data";
import type { Database } from "@/src/types/database.generated";

type QueryRecord = {
  table: string;
  orders: string[];
};

function createQuery(table: string, data: unknown, records: QueryRecord[]) {
  const record: QueryRecord = { table, orders: [] };
  records.push(record);
  const result = { data, error: null };
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn((column: string) => {
      record.orders.push(column);
      return query;
    }),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result)),
  };
  return query;
}

describe("getBudgetOverview", () => {
  it("maps active budget positions into department display order without querying a missing view field", async () => {
    const records: QueryRecord[] = [];
    const tableData: Record<string, unknown> = {
      v_active_budget_summaries: null,
      v_active_budget_department_positions: [
        { department_id: "security", department_name: "Security" },
        { department_id: "aesthetics", department_name: "Aesthetics" },
      ],
      v_budget_version_summaries: [],
      departments: [
        { id: "aesthetics", name: "Aesthetics", code: "AE", colour: null, is_active: true, display_order: 1 },
        { id: "security", name: "Security", code: "SEC", colour: null, is_active: true, display_order: 2 },
      ],
      v_event_department_financial_positions: [
        { department_id: "aesthetics", display_order: 1, current_budget_minor: null, potential_remaining_minor: null },
      ],
    };
    const supabase = {
      from: vi.fn((table: string) => createQuery(table, tableData[table] ?? [], records)),
    } as unknown as SupabaseClient<Database>;

    const result = await getBudgetOverview(supabase, "event-id");

    expect(result.error).toBeNull();
    expect(result.data?.departmentPositions.map((position) => position.department_id)).toEqual(["aesthetics", "security"]);
    expect(records.find((record) => record.table === "v_active_budget_department_positions")?.orders).toEqual([]);
    expect(records.find((record) => record.table === "v_event_department_financial_positions")?.orders).toEqual(["display_order", "department_name"]);
  });
});
