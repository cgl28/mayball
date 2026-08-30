import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  OtherRevenuePanel,
  RevenueOverviewPanel,
  TicketSnapshotsPanel,
  TicketTypesPanel,
} from "@/components/revenue-panel";
import type { RevenueOverview } from "@/lib/revenue/data";

const ticketTypes = [
  {
    ticket_type_id: "ticket-standard",
    event_id: "event-id",
    name: "Standard",
    description: "General admission",
    net_price_minor: 12500,
    vat_minor: 2500,
    gross_price_minor: 15000,
    vat_rate: 20,
    vat_treatment: "standard" as const,
    maximum_quantity: 1200,
    forecast_quantity: 1150,
    complimentary_quantity: 0,
    display_order: 1,
    is_active: true,
    maximum_net_minor: 15000000,
    maximum_vat_minor: 3000000,
    maximum_gross_minor: 18000000,
    forecast_net_minor: 14375000,
    forecast_vat_minor: 2875000,
    forecast_gross_minor: 17250000,
  },
];

const revenue: RevenueOverview = {
  summary: {
    event_id: "event-id",
    maximum_ticket_capacity: 1200,
    forecast_ticket_quantity: 1150,
    ticket_maximum_net_minor: 15000000,
    ticket_maximum_vat_minor: 3000000,
    ticket_maximum_gross_minor: 18000000,
    ticket_forecast_net_minor: 14375000,
    ticket_forecast_vat_minor: 2875000,
    ticket_forecast_gross_minor: 17250000,
    latest_snapshot_id: "snapshot-latest",
    latest_captured_at: "2027-03-01T12:00:00+00:00",
    tickets_sold_to_date: 920,
    ticket_actual_net_minor: 11500000,
    ticket_actual_vat_minor: 2300000,
    ticket_actual_gross_minor: 13800000,
    ticket_refunds_to_date_minor: 25000,
    ticket_booking_fees_to_date_minor: 276000,
    other_forecast_net_minor: 1000000,
    other_forecast_vat_minor: 200000,
    other_forecast_gross_minor: 1200000,
    other_actual_net_minor: 500000,
    other_actual_vat_minor: 0,
    other_actual_gross_minor: 500000,
    other_outstanding_gross_minor: 1200000,
    total_forecast_net_minor: 15375000,
    total_forecast_vat_minor: 3075000,
    total_forecast_gross_minor: 18450000,
    total_actual_gross_minor: 14300000,
  },
  ticketTypes,
  snapshots: [
    {
      id: "snapshot-latest",
      event_id: "event-id",
      captured_at: "2027-03-01T12:00:00+00:00",
      tickets_sold_to_date: 920,
      net_sales_minor: 11500000,
      vat_minor: 2300000,
      gross_sales_minor: 13800000,
      refunds_to_date_minor: 25000,
      booking_fees_to_date_minor: 276000,
      source: "manual_ticket_tailor",
      notes: "Latest cumulative position",
      entered_by: "user-id",
      is_void: false,
      void_reason: null,
      voided_at: null,
      created_at: "2027-03-01T12:01:00+00:00",
    },
    {
      id: "snapshot-old",
      event_id: "event-id",
      captured_at: "2027-02-01T12:00:00+00:00",
      tickets_sold_to_date: 900,
      net_sales_minor: 11250000,
      vat_minor: 2250000,
      gross_sales_minor: 13500000,
      refunds_to_date_minor: 25000,
      booking_fees_to_date_minor: 270000,
      source: "manual_ticket_tailor",
      notes: "Prior cumulative position",
      entered_by: "user-id",
      is_void: false,
      void_reason: null,
      voided_at: null,
      created_at: "2027-02-01T12:01:00+00:00",
    },
  ],
  breakdowns: [
    {
      id: "breakdown-id",
      event_id: "event-id",
      snapshot_id: "snapshot-latest",
      ticket_type_id: "ticket-standard",
      quantity_to_date: 920,
      gross_sales_minor: 13800000,
    },
  ],
  otherItems: [
    {
      id: "other-id",
      event_id: "event-id",
      title: "Local sponsor",
      category: "sponsorship",
      owner_user_id: "owner-id",
      forecast_net_minor: 1000000,
      forecast_vat_minor: 200000,
      forecast_gross_minor: 1200000,
      actual_net_minor: 0,
      actual_vat_minor: 0,
      actual_gross_minor: 0,
      vat_rate: 20,
      vat_treatment: "standard",
      expected_date: "2027-03-01",
      received_date: null,
      status: "confirmed",
      notes: "Expected",
    },
  ],
  owners: [{ id: "owner-id", display_name: "Alex Aesthetics", preferred_name: null }],
};

describe("Stage 4 revenue panels", () => {
  it("shows populated revenue overview without summing cumulative snapshots", () => {
    render(
      <RevenueOverviewPanel
        eventId="event-id"
        revenue={revenue}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Forecast vs actual income")).toBeInTheDocument();
    expect(screen.getByText("Forecast ticket income")).toBeInTheDocument();
    expect(screen.getByText("Forecast other income")).toBeInTheDocument();
    expect(screen.getByText("Total forecast income")).toBeInTheDocument();
    expect(screen.getByText("Actual ticket income")).toBeInTheDocument();
    expect(screen.getByText("Actual other income")).toBeInTheDocument();
    expect(screen.getByText("Total actual income")).toBeInTheDocument();
    expect(screen.getAllByText("£138,000.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("£273,000.00")).not.toBeInTheDocument();
    expect(screen.getByText(/Booking fees are shown separately/)).toBeInTheDocument();
    expect(screen.getAllByText(/snapshots are never added together/)).toHaveLength(2);
  });

  it("uses an uncapped recorded-income percentage and handles zero forecast income", () => {
    const { rerender } = render(
      <RevenueOverviewPanel
        eventId="event-id"
        revenue={{
          ...revenue,
          summary: {
            ...revenue.summary!,
            total_forecast_gross_minor: 100_000,
            total_actual_gross_minor: 120_000,
          },
        }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText(/120% of forecast recorded/)).toBeInTheDocument();

    rerender(
      <RevenueOverviewPanel
        eventId="event-id"
        revenue={{
          ...revenue,
          summary: {
            ...revenue.summary!,
            total_forecast_gross_minor: 0,
            total_actual_gross_minor: 120_000,
          },
        }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText(/No forecast income has been entered/)).toBeInTheDocument();
  });

  it("shows an empty state when no revenue records exist", () => {
    render(
      <RevenueOverviewPanel
        eventId="event-id"
        revenue={{ summary: null, ticketTypes: [], snapshots: [], breakdowns: [], otherItems: [], owners: [] }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("No ticket types yet.")).toBeInTheDocument();
    expect(screen.getByText("No other revenue forecast yet.")).toBeInTheDocument();
    expect(screen.getByText("No actual ticket sales recorded yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add ticket type" })).toBeInTheDocument();
  });

  it("hides ticket mutation controls from president without treasurer", () => {
    render(
      <TicketTypesPanel
        eventId="event-id"
        ticketTypes={ticketTypes}
        canManage={false}
        readOnly={false}
      />,
    );

    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.queryByText("Add ticket type")).not.toBeInTheDocument();
  });

  it("keeps ticket edit and add forms collapsed until requested", async () => {
    const user = userEvent.setup();
    render(
      <TicketTypesPanel
        eventId="event-id"
        ticketTypes={ticketTypes}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save ticket changes" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ticket price (gross)")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add ticket type" }));
    const addForm = screen.getByText("Add ticket type").closest("section")?.querySelector("form");
    expect(addForm).not.toBeNull();
    expect(within(addForm!).getByLabelText("Ticket price (gross)")).toBeInTheDocument();
    expect(within(addForm!).getByLabelText("Maximum available")).toBeInTheDocument();
    expect(within(addForm!).getByLabelText("Forecast sales")).toBeInTheDocument();
    expect(within(addForm!).queryByLabelText("Net price")).not.toBeInTheDocument();
    expect(within(addForm!).queryByLabelText("VAT amount")).not.toBeInTheDocument();
  });

  it("opens an edit form on demand with the existing ticket ID and current values", async () => {
    const user = userEvent.setup();
    render(
      <TicketTypesPanel
        eventId="event-id"
        ticketTypes={ticketTypes}
        canManage
        readOnly={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const form = screen.getByDisplayValue("ticket-standard").closest("form");
    expect(form).not.toBeNull();
    expect(within(form!).getByDisplayValue("ticket-standard")).toHaveAttribute("name", "ticketTypeId");
    expect(within(form!).getByDisplayValue("Standard")).toHaveAttribute("name", "name");
    expect(within(form!).getByDisplayValue("150.00")).toHaveAttribute("name", "grossPrice");
    expect(within(form!).getByDisplayValue("1150")).toHaveAttribute("name", "forecastQuantity");
    expect(within(form!).getByRole("button", { name: "Save ticket changes" })).toBeInTheDocument();

    await user.click(within(form!).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save ticket changes" })).not.toBeInTheDocument();
  });

  it("previews ticket forecast income from gross price and forecast sales", async () => {
    const user = userEvent.setup();
    render(
      <TicketTypesPanel
        eventId="event-id"
        ticketTypes={ticketTypes}
        canManage
        readOnly={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add ticket type" }));
    const addForm = screen.getByText("Add ticket type").closest("section")?.querySelector("form");
    expect(addForm).not.toBeNull();
    await user.type(within(addForm!).getByLabelText("Ticket price (gross)"), "150.00");
    await user.type(within(addForm!).getByLabelText("Maximum available"), "1000");
    await user.type(within(addForm!).getByLabelText("Forecast sales"), "800");

    expect(within(addForm!).getByText("Forecast preview")).toBeInTheDocument();
    expect(within(addForm!).getByText("£120,000.00")).toBeInTheDocument();
    expect(within(addForm!).getByText("£150,000.00")).toBeInTheDocument();
    expect(within(addForm!).getByText("£125.00")).toBeInTheDocument();
    expect(within(addForm!).getByText("£25.00")).toBeInTheDocument();
  });

  it("labels latest snapshots and optional breakdowns", () => {
    render(
      <TicketSnapshotsPanel
        eventId="event-id"
        snapshots={revenue.snapshots}
        breakdowns={revenue.breakdowns}
        ticketTypes={ticketTypes}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("Latest current position")).toBeInTheDocument();
    expect(screen.getByText("Type breakdown")).toBeInTheDocument();
    expect(screen.getByText("Total only")).toBeInTheDocument();
    expect(screen.getByText(/booking fees £2,760.00 shown separately/)).toBeInTheDocument();
    expect(screen.getAllByText("Record cumulative snapshot").length).toBeGreaterThan(0);
  });

  it("shows historical read-only revenue without forms", () => {
    render(
      <OtherRevenuePanel
        eventId="event-id"
        items={revenue.otherItems}
        owners={revenue.owners}
        canManage={false}
        readOnly
      />,
    );

    expect(screen.getByText(/historical event is read-only/)).toBeInTheDocument();
    expect(screen.getByText("Local sponsor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create forecast" })).not.toBeInTheDocument();
  });

  it("creates other revenue as forecast-only and exposes a separate receipt action", () => {
    render(
      <OtherRevenuePanel
        eventId="event-id"
        items={revenue.otherItems}
        owners={revenue.owners}
        canManage
        readOnly={false}
      />,
    );

    const createButton = screen.getByRole("button", { name: "Create forecast" });
    const createForm = createButton.closest("form");
    expect(createForm).not.toBeNull();
    expect(within(createForm!).getByLabelText("Forecast gross")).toBeInTheDocument();
    expect(within(createForm!).queryByLabelText("Actual received gross")).not.toBeInTheDocument();
    expect(within(createForm!).queryByLabelText("Received date")).not.toBeInTheDocument();
    expect(screen.getByText(/sponsorship owned by Alex Aesthetics/)).toBeInTheDocument();
    expect(screen.getByText("confirmed forecast")).toBeInTheDocument();
    expect(screen.getByText("Mark as received")).toBeInTheDocument();
  });
});
