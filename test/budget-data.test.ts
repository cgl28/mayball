import { describe, expect, it, vi } from "vitest";
import { getBudgetOverview } from "@/lib/budget/data";
import type { Database } from "@/src/types/database.generated";
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryRecord = {
  table: string;
  filters: Array<{ column: string; value: unknown }>;
};

function createQuery(table: string, data: unknown[], records: QueryRecord[]) {
  const record: QueryRecord = { table, filters: [] };
  records.push(record);

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      record.filters.push({ column, value });
      return query;
    }),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data: data[0] ?? null, error: null })),
    then: (resolve: (result: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };

  return query;
}

describe("getBudgetOverview", () => {
  it("does not query transfer history unless requested", async () => {
    const records: QueryRecord[] = [];
    const supabase = {
      from: vi.fn((table: string) => createQuery(table, [], records)),
    } as unknown as SupabaseClient<Database>;

    const result = await getBudgetOverview(supabase, "event-id");

    expect(result.error).toBeNull();
    expect(records.map((record) => record.table)).not.toContain("budget_transfers");
    expect(result.data?.transfers).toBeNull();
  });

  it("loads transfer history on demand", async () => {
    const records: QueryRecord[] = [];
    const supabase = {
      from: vi.fn((table: string) => createQuery(table, [], records)),
    } as unknown as SupabaseClient<Database>;

    const result = await getBudgetOverview(supabase, "event-id", true);

    expect(result.error).toBeNull();
    const transferQuery = records.find((record) => record.table === "budget_transfers");
    expect(transferQuery?.filters).toEqual([{ column: "event_id", value: "event-id" }]);
  });
});
