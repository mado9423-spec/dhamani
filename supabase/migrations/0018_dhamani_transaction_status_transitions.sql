-- Enforce a legal state machine for transactions.status at the database level.
-- The existing CHECK constraint (transactions_status_check) restricts values;
-- this adds legality of the TRANSITION itself, closing a gap where any branch
-- employee could set status to any allowed value via a raw REST update,
-- bypassing the UI's button logic entirely (e.g. completed -> pending_review).

create or replace function public.enforce_transaction_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending_review' then
      raise exception 'transactions must be created with status pending_review, got %', new.status
        using errcode = '23514';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.status = old.status then
    return new; -- no status change; other column edits are unaffected
  end if;

  v_ok := (old.status, new.status) in (
    ('pending_review', 'accepted'),
    ('pending_review', 'rejected'),
    ('pending_review', 'suspended'),
    ('accepted',       'completed'),
    ('accepted',       'rejected'),
    ('accepted',       'suspended'),
    ('suspended',      'pending_review'),
    ('suspended',      'accepted'),
    ('suspended',      'rejected')
  );

  if not v_ok then
    raise exception 'illegal transaction status transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_transaction_status_transition on public.transactions;
create trigger trg_enforce_transaction_status_transition
  before insert or update on public.transactions
  for each row execute function public.enforce_transaction_status_transition();

revoke execute on function public.enforce_transaction_status_transition() from public, anon, authenticated;
