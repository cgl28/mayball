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
        lt: vi.fn((column: string, value: unknown) => {
          record.filters.push({ method: "lt", column, value });
          return query;
        }),
        gte: vi.fn((column: string, value: unknown) => {
          record.filters.push({ method: "gte", column, value });
          return query;
        }),
        lte: vi.fn((column: string, value: unknown) => {
          record.filters.push({ method: "lte", column, value });
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

  it("loads payments with paginated slim ledger and component workload", async () => {
    const { supabase, records } = createSupabaseMock(
      {
        v_payment_details: Array.from({ length: 30 }, (_, index) => ({
          payment_id: `payment-${index}`,
          event_id: "event-id",
          code: `PAY-${index}`,
          payment_date: "2027-01-01",
          gross_minor: 1000,
          payee: "Supplier",
          method: "bank_transfer",
          bank_reference: "BANK-1",
          status: "recorded",
          allocation_count: 1,
          allocated_gross_minor: 1000,
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
        v_request_component_payment_positions: Array.from({ length: 30 }, (_, index) => ({
          event_id: "event-id",
          request_id: `request-${index}`,
          request_code: `REQ-${index}`,
          revision_id: `revision-${index}`,
          revision_number: 1,
          request_component_id: `component-${index}`,
          component_code: `REQ-${index}.1`,
          description: `Component ${index}`,
          expected_payment_date: "2027-01-01",
          supplier_name: "Supplier",
          approved_net_minor: 800,
          approved_vat_minor: 200,
          approved_gross_minor: 1000,
          paid_gross_minor: 0,
          outstanding_gross_minor: 1000,
          payment_status: "unpaid",
        })),
        v_event_payment_summaries: [{ event_id: "event-id" }],
      },
      {
        v_payment_details: 30,
        v_request_payment_positions: 30,
        v_request_component_payment_positions: 30,
      },
    );

    const result = await getPaymentsData(supabase, "event-id", {
      status: "recorded",
      search: "PAY",
      workloadView: "outstanding",
      page: 2,
      pageSize: 10,
      workloadPage: 2,
      workloadPageSize: 10,
      eventDate: "2027-06-19",
    });

    const paymentsQuery = records.find((record) => record.table === "v_payment_details");
    expect(paymentsQuery?.select).toBe("payment_id,event_id,code,payment_date,gross_minor,payee,method,bank_reference,status,allocation_count,allocated_gross_minor,request_codes,created_at");
    expect(paymentsQuery?.select).not.toContain("note");
    expect(paymentsQuery?.ranges).toEqual([{ from: 10, to: 19 }]);

    const componentQueries = records.filter((record) => record.table === "v_request_component_payment_positions");
    const workloadQuery = componentQueries.find((record) => record.select?.includes("request_component_id,component_code"));
    expect(workloadQuery?.select).toContain("expected_payment_date");
    expect(workloadQuery?.select).toContain("outstanding_gross_minor");
    expect(workloadQuery?.filters).toEqual(
      expect.arrayContaining([
        { method: "eq", column: "event_id", value: "event-id" },
        expect.objectContaining({ method: "or" }),
      ]),
    );
    expect(workloadQuery?.filters.some((filter) => ["lt", "lte", "gte"].includes(filter.method))).toBe(false);
    expect(workloadQuery?.ranges).toEqual([]);
    expect(result.data?.workload).toHaveLength(10);
    expect(result.data?.workloadCount).toBe(30);

    const summaryQuery = componentQueries.find((record) => record.select === "approved_gross_minor,paid_gross_minor,outstanding_gross_minor,expected_payment_date,payment_status");
    expect(summaryQuery?.ranges).toEqual([]);
  });

  it("filters workload rows using event-date fallback before local pagination", async () => {
    const isoOffset = (days: number) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const component = (id: string, date: string | null) => ({
      event_id: "event-id",
      request_id: `request-${id}`,
      request_code: `REQ-${id}`,
      revision_id: `revision-${id}`,
      revision_number: 1,
      request_component_id: `component-${id}`,
      component_code: `REQ-${id}.1`,
      description: `Component ${id}`,
      expected_payment_date: date,
      supplier_name: "Supplier",
      approved_net_minor: 800,
      approved_vat_minor: 200,
      approved_gross_minor: 1000,
      paid_gross_minor: 0,
      outstanding_gross_minor: 1000,
      payment_status: "unpaid",
    });
    const { supabase } = createSupabaseMock({
      v_payment_details: [],
      v_request_component_payment_positions: [
        component("past", isoOffset(-1)),
        component("event-fallback", null),
        component("future", isoOffset(30)),
      ],
      v_event_payment_summaries: [{ event_id: "event-id" }],
    });

    const result = await getPaymentsData(supabase, "event-id", {
      workloadView: "due_soon",
      eventDate: isoOffset(7),
      workloadPage: 1,
      workloadPageSize: 10,
    });

    expect(result.data?.workload.map((row) => row.request_component_id)).toEqual(["component-event-fallback"]);
    expect(result.data?.workload[0]?.effective_due_date).toBe(isoOffset(7));
    expect(result.data?.workload[0]?.due_date_source).toBe("event");
    expect(result.data?.workloadCount).toBe(1);
  });
});
