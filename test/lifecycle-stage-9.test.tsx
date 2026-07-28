import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LifecyclePanel } from "@/components/lifecycle-panel";
import type { LifecycleData } from "@/lib/lifecycle/data";
import { makeEventAccess } from "@/test/fixtures";

const lifecycle: LifecycleData = {
  summary: {
    event_id: "event-id",
    status: "planning",
    completed_at: null,
    completed_by: null,
    completed_by_display_name: null,
    archived_at: null,
    archived_by: null,
    archived_by_display_name: null,
    reopened_at: null,
    reopened_by: null,
    reopened_by_display_name: null,
    completion_note: null,
    archive_reason: null,
    reopen_reason: null,
    is_read_only: false,
    lifecycle_history_count: 0,
  },
  history: [],
  readiness: [
    {
      code: "requests_awaiting_approval",
      severity: "warning",
      category: "Requests",
      item_count: 2,
      amount_minor: 624000,
      target_route: "approvals",
      acknowledgement_allowed: true,
      blocks_completion: false,
    },
    {
      code: "unallocated_contingency",
      severity: "info",
      category: "Budget",
      item_count: 1,
      amount_minor: 1500000,
      target_route: "budget",
      acknowledgement_allowed: true,
      blocks_completion: false,
    },
  ],
};

describe("Stage 9 lifecycle panel", () => {
  it("shows lifecycle progress, readiness and confirmation copy to presidents", () => {
    render(
      <LifecyclePanel
        eventAccess={makeEventAccess({ roles: ["president"] })}
        lifecycle={lifecycle}
        canManageLifecycle
      />,
    );

    expect(screen.getByRole("heading", { name: "Lifecycle" })).toBeInTheDocument();
    expect(screen.getAllByText("Current stage").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("listitem", { name: "Setup: Completed stage" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Planning: Current stage" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Live: Future stage" })).toBeInTheDocument();
    expect(screen.getByText("Readiness warnings")).toBeInTheDocument();
    expect(screen.getAllByText("Requests are awaiting review").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/2 items; £6,240.00/)).toBeInTheDocument();
    expect(screen.getByText("Completion allowed with acknowledgement")).toBeInTheDocument();
    expect(screen.getByText("Change Lifecycle Stage")).toBeInTheDocument();
    expect(screen.getByText("Review and confirm completion")).toBeInTheDocument();
    expect(screen.getByText(/completion is not bank reconciliation/i)).toBeInTheDocument();
  });

  it("shows lifecycle status and history without mutation controls to historical viewers", () => {
    render(
      <LifecyclePanel
        eventAccess={makeEventAccess({
          event: { status: "completed", completed_at: "2027-08-01T10:00:00Z" },
          membership: null,
          roles: [],
          accessMode: "historical",
          isReadOnly: true,
        })}
        lifecycle={{
          ...lifecycle,
          summary: {
            ...lifecycle.summary!,
            status: "completed",
            completed_at: "2027-08-01T10:00:00Z",
            completed_by_display_name: "Pat President",
            is_read_only: true,
            lifecycle_history_count: 1,
          },
          history: [
            {
              id: "history-id",
              event_id: "event-id",
              previous_status: "planning",
              new_status: "completed",
              action: "completed",
              actor_user_id: "user-id",
              reason: "Committee confirmed",
              acknowledged_warnings: [],
              metadata: {},
              created_at: "2027-08-01T10:00:00Z",
              actor: { display_name: "Pat President", preferred_name: null },
            },
          ],
          readiness: [],
        }}
        canManageLifecycle={false}
      />,
    );

    expect(screen.getByText("Historical read-only event")).toBeInTheDocument();
    expect(screen.getByText(/Detailed completion readiness is available to event Presidents/)).toBeInTheDocument();
    expect(screen.getByText(/Only event Presidents can change the lifecycle stage/)).toBeInTheDocument();
    expect(screen.queryByText("Complete event")).not.toBeInTheDocument();
    expect(screen.getByText("Moved from Planning to Completed")).toBeInTheDocument();
  });

  it("shows archive and reopen success states distinctly", () => {
    render(
      <LifecyclePanel
        eventAccess={makeEventAccess({ roles: ["president"], event: { status: "archived" }, isReadOnly: true })}
        lifecycle={{
          ...lifecycle,
          summary: {
            ...lifecycle.summary!,
            status: "archived",
            archived_at: "2027-09-01T10:00:00Z",
            archived_by_display_name: "Pat President",
            is_read_only: true,
          },
          readiness: [],
        }}
        canManageLifecycle
        archived
        reopened
      />,
    );

    expect(screen.getByText(/Event archived/)).toBeInTheDocument();
    expect(screen.getByText(/Event reopened into Reconciliation/)).toBeInTheDocument();
    expect(screen.getByText("Reopen for Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Review and confirm exceptional reopening")).toBeInTheDocument();
  });

  it("shows only archive and reopen actions for completed presidents", () => {
    render(
      <LifecyclePanel
        eventAccess={makeEventAccess({
          roles: ["president"],
          event: { status: "completed" },
          isReadOnly: true,
        })}
        lifecycle={{
          ...lifecycle,
          summary: {
            ...lifecycle.summary!,
            status: "completed",
            completed_at: "2027-08-01T10:00:00Z",
            completed_by_display_name: "Pat President",
            is_read_only: true,
          },
          readiness: [],
        }}
        canManageLifecycle
      />,
    );

    expect(screen.queryByText("Review and confirm completion")).not.toBeInTheDocument();
    expect(screen.getByText("Archive Event")).toBeInTheDocument();
    expect(screen.getByText("Reopen for Reconciliation")).toBeInTheDocument();
  });

  it("does not show lifecycle controls to treasurers without president role", () => {
    render(
      <LifecyclePanel
        eventAccess={makeEventAccess({ roles: ["treasurer"] })}
        lifecycle={lifecycle}
        canManageLifecycle={false}
      />,
    );

    expect(screen.getByText(/Only event Presidents can change/)).toBeInTheDocument();
    expect(screen.queryByText("Review and confirm completion")).not.toBeInTheDocument();
  });
});
