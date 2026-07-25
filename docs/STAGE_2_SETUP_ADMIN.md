# Stage 2 Setup And Committee Administration

Stage 2 adds president-controlled, non-financial setup flows.

## Routes

- `/events/new`: create a new organisation and first event, or a recurring event for an organisation where the user is president.
- `/events/[eventId]/settings`: non-financial event identity settings.
- `/events/[eventId]/departments`: department setup and editing.
- `/events/[eventId]/committee`: committee, roles, department membership and invitations.
- `/invitations/[token]`: authenticated invitation acceptance.

## Role Model

Roles remain event-scoped on `event_member_roles`.

- `president`: event setup, departments, invitations, membership and role administration.
- `treasurer`: financial powers only.
- `committee_member`: ordinary event access.
- `read_only`: active event read-only presentation.

President does not imply treasurer. Treasurer does not imply president.

## Invitation Behaviour

Invitation records are created by `issue_invitation`.

- Tokens are generated in PostgreSQL with `extensions.gen_random_bytes`.
- Only `token_hash` is stored.
- The raw token is returned once to the president UI for local development copy-link use.
- Email delivery is not implemented in Stage 2.
- Acceptance uses `accept_invitation`, checks the signed-in user's email, status and expiry, and is idempotent for the same user.

## Local Personas

All seeded local users use the development password documented in `supabase/README.md`.

- `president@example.test`: Downing president, not treasurer.
- `treasurer@example.test`: Downing treasurer, not president.
- `membera@example.test`: ordinary Downing committee member.
- `memberb@example.test`: ordinary Downing committee member.
- `outsider@example.test`: separate-organisation president.
- `invitee@example.test`: invited-user persona for acceptance checks.
- `noevents@example.test`: authenticated profile with no visible events.

## Known Limitations

- No production email provider is integrated.
- Invitation resend/regeneration is deferred.
- Event completion, archival and reopening UI remains deferred.
- Department financial allocation is not implemented in this stage.
- Browser automation is not yet configured; runtime checks are HTTP/Node smoke tests.
