-- Stage 5 corrective hardening: keep internal request child-row helper
-- functions callable only from trusted server-side RPCs.

revoke execute on function public.insert_request_allocations(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.insert_request_components(uuid, uuid, text, jsonb) from public, anon, authenticated;
