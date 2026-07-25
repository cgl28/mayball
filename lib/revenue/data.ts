import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type EventRevenueSummary = Tables<"v_event_revenue_summaries">;
export type TicketForecastPosition = Tables<"v_ticket_type_forecast_positions">;
export type TicketSnapshot = Pick<
  Tables<"ticket_sales_snapshots">,
  | "id"
  | "event_id"
  | "captured_at"
  | "tickets_sold_to_date"
  | "net_sales_minor"
  | "vat_minor"
  | "gross_sales_minor"
  | "refunds_to_date_minor"
  | "booking_fees_to_date_minor"
  | "source"
  | "notes"
  | "entered_by"
  | "is_void"
  | "void_reason"
  | "voided_at"
  | "created_at"
>;
export type TicketSnapshotBreakdown = Pick<
  Tables<"ticket_type_sales_snapshots">,
  "id" | "event_id" | "snapshot_id" | "ticket_type_id" | "quantity_to_date" | "gross_sales_minor"
>;
export type OtherRevenueItem = Pick<
  Tables<"other_revenue_items">,
  | "id"
  | "event_id"
  | "title"
  | "category"
  | "owner_user_id"
  | "forecast_net_minor"
  | "forecast_vat_minor"
  | "forecast_gross_minor"
  | "actual_net_minor"
  | "actual_vat_minor"
  | "actual_gross_minor"
  | "vat_rate"
  | "vat_treatment"
  | "expected_date"
  | "received_date"
  | "status"
  | "notes"
>;

export type RevenueOwner = Pick<Tables<"profiles">, "id" | "display_name" | "preferred_name">;

export type RevenueOverview = {
  summary: EventRevenueSummary | null;
  ticketTypes: TicketForecastPosition[];
  snapshots: TicketSnapshot[];
  breakdowns: TicketSnapshotBreakdown[];
  otherItems: OtherRevenueItem[];
  owners: RevenueOwner[];
};

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export async function getRevenueOverview(
  supabase: SupabaseClient<Database>,
  eventId: string,
) {
  const [summary, ticketTypes, snapshots, breakdowns, otherItems, members] =
    await Promise.all([
      supabase
        .from("v_event_revenue_summaries")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabase
        .from("v_ticket_type_forecast_positions")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("ticket_sales_snapshots")
        .select("id,event_id,captured_at,tickets_sold_to_date,net_sales_minor,vat_minor,gross_sales_minor,refunds_to_date_minor,booking_fees_to_date_minor,source,notes,entered_by,is_void,void_reason,voided_at,created_at")
        .eq("event_id", eventId)
        .order("captured_at", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("ticket_type_sales_snapshots")
        .select("id,event_id,snapshot_id,ticket_type_id,quantity_to_date,gross_sales_minor")
        .eq("event_id", eventId),
      supabase
        .from("other_revenue_items")
        .select("id,event_id,title,category,owner_user_id,forecast_net_minor,forecast_vat_minor,forecast_gross_minor,actual_net_minor,actual_vat_minor,actual_gross_minor,vat_rate,vat_treatment,expected_date,received_date,status,notes")
        .eq("event_id", eventId)
        .order("expected_date", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true }),
      supabase
        .from("event_members")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("status", "active"),
    ]);

  if (summary.error) return { data: null, error: "Revenue summary could not be loaded." };
  if (ticketTypes.error) return { data: null, error: "Ticket types could not be loaded." };
  if (snapshots.error) return { data: null, error: "Ticket snapshots could not be loaded." };
  if (breakdowns.error) return { data: null, error: "Ticket snapshot breakdowns could not be loaded." };
  if (otherItems.error) return { data: null, error: "Other revenue could not be loaded." };
  if (members.error) return { data: null, error: "Committee owners could not be loaded." };

  const ownerIds = unique([
    ...(members.data ?? []).map((member) => member.user_id),
    ...(otherItems.data ?? [])
      .map((item) => item.owner_user_id)
      .filter((id): id is string => Boolean(id)),
  ]);
  const owners = ownerIds.length
    ? await supabase
        .from("profiles")
        .select("id,display_name,preferred_name")
        .in("id", ownerIds)
        .order("display_name", { ascending: true })
    : { data: [] as RevenueOwner[], error: null };

  if (owners.error) return { data: null, error: "Revenue owners could not be loaded." };

  return {
    data: {
      summary: summary.data,
      ticketTypes: ticketTypes.data ?? [],
      snapshots: snapshots.data ?? [],
      breakdowns: breakdowns.data ?? [],
      otherItems: otherItems.data ?? [],
      owners: owners.data ?? [],
    } satisfies RevenueOverview,
    error: null,
  };
}
