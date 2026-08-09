import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type DepartmentPosition = Tables<"v_event_department_financial_positions">;
type RequestRow = Tables<"v_spending_request_current_revisions">;
type AllocationRow = Pick<Tables<"spending_request_department_allocations">, "department_id" | "revision_id" | "net_minor" | "vat_minor" | "gross_minor">;

export type DepartmentFinanceRequest = {
  requestId: string;
  revisionId: string;
  reference: string;
  title: string;
  supplier: string | null;
  ownerName: string;
  approvalStatus: string;
  paymentStatus: string;
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  paidGrossMinor: number;
  outstandingGrossMinor: number;
  updatedAt: string | null;
  isDraft: boolean;
  vatRecoverable: boolean;
};

export type DepartmentFinanceTotals = {
  requestCount: number;
  totalNetMinor: number;
  totalVatMinor: number;
  totalGrossMinor: number;
  approvedNetMinor: number;
  submittedNetMinor: number;
  recoverableVatMinor: number;
  approvedGrossMinor: number;
  paidGrossMinor: number;
  outstandingGrossMinor: number;
  approvedPaidNetMinor: number;
  approvedUnpaidNetMinor: number;
};

export type FinancePositionSummary = {
  budgetNetMinor: number | null;
  approvedNetMinor: number;
  approvedPaidNetMinor: number;
  approvedUnpaidNetMinor: number;
  submittedNetMinor: number;
  remainingNetMinor: number | null;
  paidGrossMinor: number;
};

export type FinancesData = {
  departments: DepartmentPosition[];
  selectedDepartment: DepartmentPosition | null;
  wholeEvent: FinancePositionSummary;
  requests: DepartmentFinanceRequest[];
  totals: DepartmentFinanceTotals;
};

function numeric(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function ownerName(request: RequestRow) {
  return request.owner_preferred_name ?? request.owner_display_name ?? "Committee member";
}

function paymentShare(allocationGross: number, requestApprovedGross: number) {
  if (requestApprovedGross <= 0) return 0;
  return allocationGross / requestApprovedGross;
}

function apportion(value: number, share: number) {
  return Math.round(value * share);
}

function paidNetFromGross(approvedNet: number, approvedGross: number, paidGross: number) {
  if (approvedNet <= 0 || approvedGross <= 0 || paidGross <= 0) return 0;
  const cappedPaidGross = Math.min(approvedGross, paidGross);
  return Math.min(approvedNet, Math.round((approvedNet * cappedPaidGross) / approvedGross));
}

export async function getFinancesData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  requestedDepartmentId?: string,
) {
  const [departmentsResult, requestsResult, paymentsResult] = await Promise.all([
    supabase
      .from("v_event_department_financial_positions")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true })
      .order("department_name", { ascending: true }),
    supabase
      .from("v_spending_request_current_revisions")
      .select("*")
      .eq("event_id", eventId)
      .order("request_updated_at", { ascending: false }),
    supabase
      .from("v_request_payment_positions")
      .select("*")
      .eq("event_id", eventId),
  ]);

  if (departmentsResult.error) return { data: null, error: "Department finance positions could not be loaded." };
  if (requestsResult.error) return { data: null, error: "Spending requests could not be loaded." };
  if (paymentsResult.error) return { data: null, error: "Payment positions could not be loaded." };

  const departments = departmentsResult.data ?? [];
  const selectedDepartment =
    departments.find((department) => department.department_id === requestedDepartmentId) ??
    departments[0] ??
    null;

  const requests = requestsResult.data ?? [];
  const selectedDepartmentId = selectedDepartment?.department_id;

  const allocationsResult = selectedDepartmentId
    ? await supabase
        .from("spending_request_department_allocations")
        .select("department_id,revision_id,net_minor,vat_minor,gross_minor")
        .eq("event_id", eventId)
        .eq("department_id", selectedDepartmentId)
    : { data: [] as AllocationRow[], error: null };

  if (allocationsResult.error) return { data: null, error: "Department request allocations could not be loaded." };

  const paymentByRequestId = new Map((paymentsResult.data ?? []).map((payment) => [payment.request_id, payment]));
  const requestsByRevisionId = new Map(requests.map((request) => [request.revision_id, request]));
  const selectedAllocations = allocationsResult.data ?? [];

  const rows = selectedAllocations.reduce<DepartmentFinanceRequest[]>((acc, allocation) => {
      const request = requestsByRevisionId.get(allocation.revision_id);
      if (!request?.request_id || !request.revision_id) return acc;
      const payment = paymentByRequestId.get(request.request_id);
      const allocationGross = numeric(allocation.gross_minor);
      const share = paymentShare(allocationGross, numeric(payment?.approved_gross_minor));
      const paidGrossMinor = payment ? apportion(numeric(payment.paid_gross_minor), share) : 0;
      const outstandingGrossMinor = payment ? Math.max(0, allocationGross - paidGrossMinor) : 0;

      acc.push({
        requestId: request.request_id,
        revisionId: request.revision_id,
        reference: request.code ?? "Unreferenced",
        title: request.title ?? "Untitled request",
        supplier: request.supplier_name,
        ownerName: ownerName(request),
        approvalStatus: request.approval_status ?? "draft",
        paymentStatus: payment?.payment_status ?? "not_applicable",
        netMinor: numeric(allocation.net_minor),
        vatMinor: numeric(allocation.vat_minor),
        grossMinor: allocationGross,
        paidGrossMinor,
        outstandingGrossMinor,
        updatedAt: request.revision_updated_at ?? request.request_updated_at,
        isDraft: request.approval_status === "draft" || request.revision_status === "draft",
        vatRecoverable: Boolean(request.vat_recoverable),
      });
      return acc;
    }, []);

  const totals = rows.reduce<DepartmentFinanceTotals>(
    (sum, row) => {
      const isApproved = row.approvalStatus === "approved";
      const isSubmitted = row.approvalStatus === "submitted" || row.approvalStatus === "variation_pending";
      const paidNetMinor = isApproved
        ? paidNetFromGross(row.netMinor, row.grossMinor, row.paidGrossMinor)
        : 0;
      return {
        requestCount: sum.requestCount + 1,
        totalNetMinor: sum.totalNetMinor + row.netMinor,
        totalVatMinor: sum.totalVatMinor + row.vatMinor,
        totalGrossMinor: sum.totalGrossMinor + row.grossMinor,
        approvedNetMinor: sum.approvedNetMinor + (isApproved ? row.netMinor : 0),
        submittedNetMinor: sum.submittedNetMinor + (isSubmitted ? row.netMinor : 0),
        recoverableVatMinor: sum.recoverableVatMinor + (isApproved && row.vatRecoverable ? row.vatMinor : 0),
        approvedGrossMinor: sum.approvedGrossMinor + (isApproved ? row.grossMinor : 0),
        paidGrossMinor: sum.paidGrossMinor + (isApproved ? row.paidGrossMinor : 0),
        outstandingGrossMinor: sum.outstandingGrossMinor + (isApproved ? row.outstandingGrossMinor : 0),
        approvedPaidNetMinor: sum.approvedPaidNetMinor + paidNetMinor,
        approvedUnpaidNetMinor: sum.approvedUnpaidNetMinor + (isApproved ? Math.max(0, row.netMinor - paidNetMinor) : 0),
      };
    },
    {
      requestCount: 0,
      totalNetMinor: 0,
      totalVatMinor: 0,
      totalGrossMinor: 0,
      approvedNetMinor: 0,
      submittedNetMinor: 0,
      recoverableVatMinor: 0,
      approvedGrossMinor: 0,
      paidGrossMinor: 0,
      outstandingGrossMinor: 0,
      approvedPaidNetMinor: 0,
      approvedUnpaidNetMinor: 0,
    },
  );

  const wholeBudget =
    departments.some((department) => department.has_active_allocation)
      ? departments.reduce((sum, department) => sum + numeric(department.current_budget_minor), 0)
      : null;
  const wholeApprovedNet = departments.reduce((sum, department) => sum + numeric(department.approved_net_minor), 0);
  const wholeSubmittedNet = departments.reduce((sum, department) => sum + numeric(department.pending_net_minor), 0);
  const wholePaidNet = (paymentsResult.data ?? []).reduce(
    (sum, payment) =>
      sum + paidNetFromGross(
        numeric(payment.approved_net_minor),
        numeric(payment.approved_gross_minor),
        numeric(payment.paid_gross_minor),
      ),
    0,
  );
  const wholePaidGross = (paymentsResult.data ?? []).reduce(
    (sum, payment) => sum + numeric(payment.paid_gross_minor),
    0,
  );
  const wholeEvent: FinancePositionSummary = {
    budgetNetMinor: wholeBudget,
    approvedNetMinor: wholeApprovedNet,
    approvedPaidNetMinor: wholePaidNet,
    approvedUnpaidNetMinor: Math.max(0, wholeApprovedNet - wholePaidNet),
    submittedNetMinor: wholeSubmittedNet,
    remainingNetMinor: wholeBudget === null ? null : wholeBudget - wholeApprovedNet - wholeSubmittedNet,
    paidGrossMinor: wholePaidGross,
  };

  return {
    data: {
      departments,
      selectedDepartment,
      wholeEvent,
      requests: rows,
      totals,
    } satisfies FinancesData,
    error: null,
  };
}
