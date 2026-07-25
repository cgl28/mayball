# Stage 6: Treasurer Approval

Stage 6 adds treasurer review, decision history, changes-requested editing and approved-request variations. It does not add payments, invoices, document uploads, bank reconciliation, exports or the final dashboard.

## Routes

- `/events/[eventId]/approvals`: treasurer-only approval queue.
- `/events/[eventId]/approvals/[requestId]`: treasurer review and decision screen.
- `/events/[eventId]/requests/[requestId]/revisions`: read-only revision and review history.
- `/events/[eventId]/requests/[requestId]/variation/new`: owner confirmation screen for starting a variation.

## Authority

Only event treasurers can approve, reject or request changes. President status alone does not grant approval authority.

Self-approval rule: the current product and database specifications do not prohibit self-approval when the request creator is also an event treasurer, and the existing schema does not encode a second-treasurer requirement. Stage 6 therefore allows self-approval for a creator who also holds the treasurer role. A future separation-of-duties policy should be added as an explicit product decision and database invariant.

## Lifecycle

Initial request:

```text
draft -> submitted -> approved
                  -> rejected
                  -> changes_requested -> draft clone -> submitted
```

Approved request variation:

```text
approved baseline -> variation draft -> variation_pending -> approved
                                                   -> rejected
                                                   -> changes_requested
```

Submitted and approved revisions are immutable. Requesting changes marks the reviewed submitted revision as `changes_requested` and creates a new owner-editable draft revision. Treasurer review never edits the creator's submitted proposal.

## Budget Impact

Review screens use database views for financial context:

- `v_department_spending_positions`
- `v_request_department_impacts`
- `v_event_approval_context`

Approved spending uses only each request's `current_approved_revision_id`. Pending initial requests count their full proposed amount. Pending variations count only the positive incremental difference over the approved baseline. Contingency is displayed separately and is not treated as department budget unless formally transferred.

## Variations

`start_request_variation` clones the current approved revision into a private owner-editable draft. The approved baseline remains canonical while the variation is edited and while it is pending review. If approved, the variation becomes the new approved revision and the previous approved revision is marked `superseded`. If rejected, the previous approved revision remains canonical.

## Seed Scenarios

The deterministic local seed includes:

- Private drafts owned by ordinary members and a treasurer.
- Submitted initial request awaiting review.
- Approved request.
- Rejected request.
- Changes-requested request with an old immutable submitted revision and a new editable draft.
- Approved request with pending variation.
- Historical submitted request.
- Separate-organisation draft.

All seed users use the development password documented in `supabase/README.md`.

## Testing

Run:

```bash
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > src/types/database.generated.ts
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Stage 6 pgTAP tests cover treasurer authority, president/ordinary/outsider denial, approval, rejection, request changes, cloned revision editing/resubmission, pending variation baseline preservation and incremental pending exposure.

## Known Limitations

The revision comparison is intentionally compact: it compares headline fields and money totals, while department impact rows show allocation-level financial differences. Payment state remains derived by Stage 7 payment work. Request cancellation remains deferred.
