import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getPaymentsData } from "@/lib/payments/data";
import { getSpendingRequestsData } from "@/lib/requests/data";
import type { Database } from "@/src/types/database.generated";

type QueryRecord = {
  table: string;
  select?: string;
  selectOptions?: unknown;
  filters: Array<{ method: string; column?: string; value?: unknown }>;
  ranges: Array<{ from: number; to: number }>;
};

function createSupabaseMock(tableData: Record<string, unknown[]>, tableCounts: Record<string, number> = {}) {
  const records: QueryRecord[] = [];

  const supabase = {
    from: vi.fn((table: string) => {
      const record: QueryRecord = { table, filters: [], ranges: [] };
      records.push(record);
      let resultData = tableData[table] ?? [];

      const query = {
        select: vi.fn((columns: string, options?: unknown) => {
          record.select = columns;
          record.selectOptions = options;
          return query;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          record.filters.push({ method: "eq", column, value });
          return query;
        }),
        neq: vi.fn((column: string, value: unknown) => {
          record.filters.push({ method: "neq", column, value });
          return query;
        }),
        gt: vi.fn((column: string, value: unknown) => {
          record.filters.push({ method: "gt", column, value });
          return query;
        }),
        in: vi.fn((column: string, value: unknown[]) => {
          record.filters.push({ method: "in", column, value });
          return query;
        }),
        or: vi.fn((value: string) => {
          record.filters.push({ method: "or", value });
          return query;
        }),
        order: vi.fn(() => query),
        range: vi.fn((from: number, to: number) => {
          record.ranges.push({ from, to });
          resultData = resultData.slice(from, to + 1);
          return query;
        }),
        maybeSingle: vi.fn(() =>
          Promise.resolve({ data: resultData[0] ?? null, error: null, count: null }),
        ),
        then: (resolve: (result: { data: unknown[]; error: null; count: number | null }) => unknown) =>
          Promise.resolve(
            resolve({
              data: resultData,
              error: null,
              count: tableCounts[table] ?? resultData.length,
            }),
          ),
      };

      return query;
    }),
  } as unknown as SupabaseClient<Database>;

  return { supabase, records };
}

describe("large list data queries", () => {
  it("loads spending request list rows with a slim projection and server range", async () => {
    const { supabase, records } = createSupabaseMock(
      {
        v_spending_request_current_revisions: Array.from({ length: 30 }, (_, index) => ({
          request_id: `request-${index}`,
          event_id: "event-id",
          code: `REQ-${index}`,
          title: `Request ${index}`,
          owner_display_name: "Owner",
          owner_preferred_name: null,
          primary_department_id: "department-id",
          primary_department_name: "Department",
          primary_department_code: "DEP",
          approval_status: "submitted",
          gross_minor: 1000,
          request_updated_at: "2027-01-01T00:00:00Z",
          revision_status: "submitted",
          can_edit_draft: false,
        })),
        departments: [],
        event_members: [],
        department_members: [],
        v_request_payment_positions: [],
      },
      { v_spending_request_current_revisions: 30 },
    );

    await getSpendingRequestsData(supabase, "event-id", "user-id", {
      status: "submitted",
      search: "REQ",
      page: 2,
      pageSize: 10,
    });

    const requestQuery = records.find((record) => record.table === "v_spending_request_current_revisions");
    expect(requestQuery?.select).toContain("request_id,event_id,code,title");
    expect(requestQuery?.select).not.toContain("description");
    expect(requestQuery?.select).not.toContain("business_justification");
    expect(requestQuery?.filters).toEqual(
      expect.arrayContaining([
        { method: "eq", column: "event_id", value: "event-id" },
        { method: "eq", column: "approval_status", value: "submitted" },
        expect.objectContaining({ method: "or" }),
      ]),
    );
    expect(requestQuery?.ranges).toEqual([{ from: 10, to: 19 }]);

    const paymentQuery = records.find((record) => record.table === "v_request_payment_positions");
    expect(paymentQuery?.select).toBe("request_id,payment_status");
    expect(paymentQuery?.filters.some((filter) => filter.method === "in")).toBe(true);
  });

  it("loads payments with paginated slim history and count-only component positions", async () => {
    const { supabase, records } = createSupabaseMock(
      {
        v_payment_details: Array.from({ length: 30 }, (_, index) => ({
          payment_id: `payment-${index}`,
          event_id: "event-id",
          code: `PAY-${index}`,
          payment_date: "2027-01-01",
          gross_minor: 1000,
          payee: "Supplier",
          status: "recorded",
          request_codes: "REQ-1",
          created_at: "2027-01-01T00:00:00Z",
        })),
        v_request_payment_positions: Array.from({ length: 30 }, (_, index) => ({
          request_id: `request-${index}`,
          code: `REQ-${index}`,
          approved_gross_minor: 1000,
          paid_gross_minor: 0,
          outstanding_gross_minor: 1000,
          payment_status: "unpaid",
        })),
        v_request_component_payment_positions: [],
        v_event_payment_summaries: [{ event_id: "event-id" }],
      },
      {
        v_payment_details: 30,
        v_request_payment_positions: 30,
        v_request_component_payment_positions: 12,
      },
    );

    await getPaymentsData(supabase, "event-id", {
      status: "recorded",
      search: "PAY",
      page: 2,
      pageSize: 10,
      requestPage: 2,
      requestPageSize: 10,
    });

    const paymentsQuery = records.find((record) => record.table === "v_payment_details");
    expect(paymentsQuery?.select).toBe("payment_id,event_id,code,payment_date,gross_minor,payee,status,request_codes,created_at");
    expect(paymentsQuery?.select).not.toContain("note");
    expect(paymentsQuery?.ranges).toEqual([{ from: 10, to: 19 }]);

    const requestPositionsQuery = records.find((record) => record.table === "v_request_payment_positions");
    expect(requestPositionsQuery?.select).toBe("request_id,code,approved_gross_minor,paid_gross_minor,outstanding_gross_minor,payment_status");
    expect(requestPositionsQuery?.ranges).toEqual([{ from: 10, to: 19 }]);

    const componentPositionsQuery = records.find((record) => record.table === "v_request_component_payment_positions");
    expect(componentPositionsQuery?.select).toBe("request_component_id");
    expect(componentPositionsQuery?.selectOptions).toEqual({ count: "exact", head: true });
  });
});
