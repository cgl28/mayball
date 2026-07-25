begin;

drop function if exists public.update_spending_request_draft(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  date,
  bigint,
  bigint,
  bigint,
  numeric,
  public.vat_treatment,
  boolean,
  jsonb,
  jsonb
);

commit;
