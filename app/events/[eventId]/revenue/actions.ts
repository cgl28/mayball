"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Enums } from "@/src/types/database.generated";
import { parseMoneyToMinor } from "@/lib/money";
import {
  calculateTicketPriceBreakdown,
  defaultTicketVatRate,
  ticketVatRateApplies,
} from "@/lib/revenue/ticket-pricing";
import { createClient } from "@/lib/supabase/server";

type VatTreatment = Enums<"vat_treatment">;
type SnapshotSource = Enums<"snapshot_source">;
type RevenueCategory = Enums<"revenue_item_category">;
type RevenueStatus = Enums<"revenue_item_status">;

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text || undefined;
}

function optionalMoney(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text ? parseMoneyToMinor(text) : undefined;
}

function requiredInt(value: FormDataEntryValue | null, label: string) {
  const text = clean(value);
  if (!/^\d+$/.test(text)) throw new Error(`${label} must be a whole number.`);
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} is too large.`);
  return parsed;
}

function optionalInt(value: FormDataEntryValue | null, label: string) {
  const text = clean(value);
  if (!text) return undefined;
  if (!/^\d+$/.test(text)) throw new Error(`${label} must be a whole number.`);
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} is too large.`);
  return parsed;
}

function optionalRate(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("VAT rate must be a percentage with no more than two decimal places.");
  const parsed = Number(text);
  if (parsed < 0 || parsed > 100) throw new Error("VAT rate must be between 0 and 100.");
  return parsed;
}

function vatTreatment(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return "standard" as VatTreatment;
  return text as VatTreatment;
}

function isFrameworkRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "";
}

function safeMessage(error: unknown) {
  const message = errorMessage(error);
  if (message) {
    if (/Ticket price net and VAT must equal gross/i.test(message)) {
      return "Ticket type could not be created. Check the gross ticket price and VAT settings.";
    }
    if (/Forecast and complimentary tickets cannot exceed capacity/i.test(message)) {
      return "Ticket type could not be created. Forecast sales and complimentary tickets cannot exceed the maximum available.";
    }
    if (/Ticket type name is required/i.test(message)) {
      return "Ticket type could not be created. Enter a ticket type name.";
    }
    if (/authorised|ticket|revenue|snapshot|amount|VAT|gross|net|capacity|quantity|maximum|forecast|exceed|owner|date|breakdown|negative|required|display/i.test(message)) {
      return message;
    }
  }
  return "Revenue action could not be completed.";
}

async function rpcClient(returnTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return supabase;
}

export async function saveTicketTypeAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const ticketTypeId = optional(formData.get("ticketTypeId"));
  const returnPath = `/events/${eventId}/revenue/tickets`;
  const supabase = await rpcClient(returnPath);

  try {
    const treatment = vatTreatment(formData.get("vatTreatment"));
    const requestedRate = optionalRate(formData.get("vatRate"));
    const effectiveRate = ticketVatRateApplies(treatment)
      ? requestedRate ?? defaultTicketVatRate(treatment)
      : 0;
    const grossMinor = parseMoneyToMinor(clean(formData.get("grossPrice")));
    if (grossMinor <= 0) {
      throw new Error("Ticket price must be greater than £0.");
    }
    const maximumQuantity = requiredInt(formData.get("maximumQuantity"), "Maximum available");
    const forecastQuantity = requiredInt(formData.get("forecastQuantity"), "Forecast sales");
    const complimentaryQuantity = optionalInt(formData.get("complimentaryQuantity"), "Complimentary tickets") ?? 0;
    if (maximumQuantity <= 0) {
      throw new Error("Maximum available must be greater than 0.");
    }
    if (forecastQuantity > maximumQuantity) {
      throw new Error("Forecast sales cannot exceed the maximum available.");
    }
    if (forecastQuantity + complimentaryQuantity > maximumQuantity) {
      throw new Error("Forecast sales and complimentary tickets cannot exceed the maximum available.");
    }
    const price = calculateTicketPriceBreakdown({
      grossMinor,
      vatRate: effectiveRate,
      vatTreatment: treatment,
    });

    const { error } = await supabase.rpc("save_ticket_type", {
      p_event_id: eventId,
      p_ticket_type_id: ticketTypeId,
      p_name: clean(formData.get("name")),
      p_description: optional(formData.get("description")),
      p_net_price_minor: price.netMinor,
      p_vat_minor: price.vatMinor,
      p_gross_price_minor: price.grossMinor,
      p_vat_rate: price.vatRate,
      p_vat_treatment: treatment,
      p_maximum_quantity: maximumQuantity,
      p_forecast_quantity: forecastQuantity,
      p_complimentary_quantity: complimentaryQuantity,
      p_display_order: optionalInt(formData.get("displayOrder"), "Display order") ?? 0,
      p_is_active: clean(formData.get("isActive")) === "on",
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/revenue`);
    redirect(`${returnPath}?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function recordTicketSnapshotAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const returnPath = `/events/${eventId}/revenue/actual`;
  const supabase = await rpcClient(returnPath);

  try {
    const ticketTypeIds = formData.getAll("ticketTypeId").map(String);
    const breakdown = ticketTypeIds.flatMap((ticketTypeId) => {
      const quantity = optionalInt(formData.get(`quantity_${ticketTypeId}`), "Breakdown quantity");
      const gross = optionalMoney(formData.get(`gross_${ticketTypeId}`));
      if (quantity === undefined && gross === undefined) return [];
      if (quantity === undefined || gross === undefined) {
        throw new Error("Each ticket breakdown row needs both quantity and gross sales.");
      }
      return [{ ticket_type_id: ticketTypeId, quantity_to_date: quantity, gross_sales_minor: gross }];
    });

    const { error } = await supabase.rpc("record_ticket_sales_snapshot", {
      p_event_id: eventId,
      p_captured_at: clean(formData.get("capturedAt")),
      p_tickets_sold_to_date: optionalInt(formData.get("ticketsSold"), "Tickets sold"),
      p_net_sales_minor: optionalMoney(formData.get("netSales")),
      p_vat_minor: optionalMoney(formData.get("vatSales")),
      p_gross_sales_minor: parseMoneyToMinor(clean(formData.get("grossSales"))),
      p_refunds_to_date_minor: optionalMoney(formData.get("refunds")) ?? 0,
      p_booking_fees_to_date_minor: optionalMoney(formData.get("bookingFees")) ?? 0,
      p_source: clean(formData.get("source")) as SnapshotSource,
      p_notes: optional(formData.get("notes")),
      p_breakdown: breakdown,
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/revenue`);
    redirect(`${returnPath}?recorded=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function saveOtherRevenueAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const itemId = optional(formData.get("itemId"));
  const returnPath = `/events/${eventId}/revenue/other`;
  const supabase = await rpcClient(returnPath);

  try {
    const { error } = await supabase.rpc("save_other_revenue_item", {
      p_event_id: eventId,
      p_item_id: itemId,
      p_title: clean(formData.get("title")),
      p_category: clean(formData.get("category")) as RevenueCategory,
      p_owner_user_id: optional(formData.get("ownerUserId")),
      p_forecast_net_minor: parseMoneyToMinor(clean(formData.get("forecastNet"))),
      p_forecast_vat_minor: parseMoneyToMinor(clean(formData.get("forecastVat"))),
      p_forecast_gross_minor: parseMoneyToMinor(clean(formData.get("forecastGross"))),
      p_actual_net_minor: optionalMoney(formData.get("actualNet")) ?? 0,
      p_actual_vat_minor: optionalMoney(formData.get("actualVat")) ?? 0,
      p_actual_gross_minor: optionalMoney(formData.get("actualGross")) ?? 0,
      p_vat_rate: optionalRate(formData.get("vatRate")),
      p_vat_treatment: clean(formData.get("vatTreatment")) as VatTreatment,
      p_expected_date: optional(formData.get("expectedDate")),
      p_received_date: optional(formData.get("receivedDate")),
      p_status: clean(formData.get("status")) as RevenueStatus,
      p_notes: optional(formData.get("notes")),
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/revenue`);
    redirect(`${returnPath}?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
