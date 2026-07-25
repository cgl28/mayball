begin;

create or replace function public.prevent_submitted_revision_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op = 'DELETE' and old.status <> 'draft' then
    raise exception 'Submitted request revisions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'draft' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.business_justification is distinct from old.business_justification
      or new.supplier_name is distinct from old.supplier_name
      or new.expected_payment_date is distinct from old.expected_payment_date
      or new.net_minor is distinct from old.net_minor
      or new.vat_minor is distinct from old.vat_minor
      or new.gross_minor is distinct from old.gross_minor
      or new.vat_rate is distinct from old.vat_rate
      or new.vat_treatment is distinct from old.vat_treatment
      or new.vat_recoverable is distinct from old.vat_recoverable
      or new.calculation_overridden is distinct from old.calculation_overridden
      or new.calculation_override_reason is distinct from old.calculation_override_reason
      or new.change_summary is distinct from old.change_summary then
      raise exception 'Submitted request revisions are immutable';
    end if;
  end if;
  return new;
end $$;

commit;
