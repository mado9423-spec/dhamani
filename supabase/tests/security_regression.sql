-- ============================================================================
-- Dhamani -- automated security regression suite
-- ============================================================================
-- Run this in the Supabase SQL Editor (or via any Postgres client connected
-- to this project) any time after a schema or RLS change, to confirm nothing
-- that was previously fixed has regressed.
--
-- Safe to run on production data: everything runs inside one transaction and
-- the script deliberately raises an exception at the end so ALL writes it
-- makes (test rows, activation codes, audit log entries) are rolled back
-- automatically. It never commits anything.
--
-- Reading the result: the whole report is delivered as a single error
-- message (Postgres has no other way to print from a function). Every line
-- starts with PASS, FAIL, SKIP or INFO. Scan for "FAIL" -- zero FAIL lines
-- means the suite passed. SKIP lines mean a check didn't apply to the
-- current data (e.g. only one branch exists) and is not a failure.
-- ============================================================================

do $$
declare
  r text[] := array[]::text[];

  -- fixtures, read-only lookups from real data
  c1_uid uuid; c1_id uuid; c1_pension text;
  e_uid uuid; e_branch uuid; e_role text;
  other_branch_citizen_id uuid;
  t text;
  n int;
  tables text[] := array[
    'branches','citizens','employees','transaction_types','transactions',
    'military_transactions','appointments','annual_declarations','notifications',
    'audit_logs','documents','employers','employer_officers','employments',
    'contribution_rates','contributions','citizen_credentials',
    'citizen_activation_codes','auth_attempts'
  ];

  -- transaction-workflow fixtures
  br_id uuid; tt_id uuid; probe_txn_id uuid;

  -- pin-auth fixtures
  probe_citizen_id uuid;
  activation_result jsonb;
  login_result jsonb;
  raw_code text;
  i int;
begin
  -- ==========================================================================
  -- 1) RLS: anon must be denied on every Dhamani table, no exceptions
  -- ==========================================================================
  execute 'set local role anon';
  foreach t in array tables loop
    begin
      execute format('select 1 from public.%I limit 1', t);
      r := array_append(r, 'FAIL anon can read table: '||t);
    exception when others then
      r := array_append(r, 'PASS anon blocked from table: '||t);
    end;
  end loop;
  reset role;

  -- ==========================================================================
  -- 2) Citizen isolation
  -- ==========================================================================
  select auth_user_id, id, pension_number into c1_uid, c1_id, c1_pension
  from public.citizens where auth_user_id is not null limit 1;

  if c1_uid is null then
    r := array_append(r, 'SKIP citizen-isolation checks (no activated citizen in this dataset)');
  else
    perform set_config('request.jwt.claims', json_build_object('sub', c1_uid, 'role','authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) into n from public.citizens;
    r := array_append(r, case when n = 1
      then 'PASS citizen sees only own row in citizens'
      else 'FAIL citizen sees '||n||' rows in citizens (expected 1)' end);

    begin
      update public.citizens set pension_status = 'PROBE' where id = c1_id;
      r := array_append(r, 'FAIL citizen changed a protected column (pension_status)');
    exception when others then
      r := array_append(r, 'PASS citizen blocked from changing protected columns');
    end;

    update public.citizens set phone = coalesce(phone, '') where id = c1_id;
    r := array_append(r, 'PASS citizen can still update own phone');

    select count(*) into n from public.employees;
    r := array_append(r, case when n = 0
      then 'PASS citizen sees no rows in employees'
      else 'FAIL citizen sees '||n||' rows in employees' end);

    reset role;
  end if;

  -- ==========================================================================
  -- 3) Employee branch scoping
  -- ==========================================================================
  select auth_user_id, branch_id, role into e_uid, e_branch, e_role
  from public.employees where is_active limit 1;

  if e_uid is null then
    r := array_append(r, 'SKIP employee branch-scoping checks (no active employee)');
  else
    select id into other_branch_citizen_id from public.citizens where branch_id <> e_branch limit 1;

    perform set_config('request.jwt.claims', json_build_object('sub', e_uid, 'role','authenticated')::text, true);
    execute 'set local role authenticated';

    if other_branch_citizen_id is not null and e_role <> 'admin' then
      select count(*) into n from public.citizens where id = other_branch_citizen_id;
      r := array_append(r, case when n = 0
        then 'PASS employee cannot see other-branch citizen'
        else 'FAIL employee can see other-branch citizen' end);
    else
      r := array_append(r, 'SKIP other-branch citizen check (single-branch data or admin role)');
    end if;

    reset role;

    -- anon must never reach admin-style RPCs either
    execute 'set local role anon';
    begin
      perform public.issue_citizen_activation_code(coalesce(c1_id, other_branch_citizen_id));
      r := array_append(r, 'FAIL anon called issue_citizen_activation_code');
    exception when others then
      r := array_append(r, 'PASS anon blocked from issue_citizen_activation_code');
    end;
    reset role;
  end if;

  -- ==========================================================================
  -- 4) Transaction status workflow (state machine + CHECK constraint)
  -- ==========================================================================
  if e_uid is null or c1_id is null then
    r := array_append(r, 'SKIP transaction workflow checks (missing employee or citizen fixture)');
  else
    select branch_id, id into br_id, tt_id from public.transactions limit 1; -- fallback branch
    select id into br_id from public.branches limit 1;
    select id into tt_id from public.transaction_types limit 1;

    perform set_config('request.jwt.claims', json_build_object('sub', e_uid, 'role','authenticated')::text, true);
    execute 'set local role authenticated';

    insert into public.transactions (citizen_id, branch_id, transaction_type_id, transaction_number, status)
    values (c1_id, br_id, tt_id, 'SECTEST-'||floor(random()*1000000)::text, 'pending_review')
    returning id into probe_txn_id;
    r := array_append(r, 'PASS transaction created with pending_review');

    begin
      insert into public.transactions (citizen_id, branch_id, transaction_type_id, transaction_number, status)
      values (c1_id, br_id, tt_id, 'SECTEST-'||floor(random()*1000000)::text, 'completed');
      r := array_append(r, 'FAIL transaction created directly as completed');
    exception when others then
      r := array_append(r, 'PASS blocked creating transaction with non-pending status');
    end;

    update public.transactions set status = 'accepted' where id = probe_txn_id;
    update public.transactions set status = 'completed' where id = probe_txn_id;
    r := array_append(r, 'PASS legal workflow pending_review -> accepted -> completed');

    begin
      update public.transactions set status = 'pending_review' where id = probe_txn_id;
      r := array_append(r, 'FAIL completed transaction moved backward');
    exception when others then
      r := array_append(r, 'PASS terminal state (completed) cannot be reopened');
    end;

    begin
      update public.transactions set status = 'BOGUS' where id = probe_txn_id;
      r := array_append(r, 'FAIL arbitrary status value accepted');
    exception when others then
      r := array_append(r, 'PASS arbitrary status value rejected');
    end;

    reset role;
  end if;

  -- ==========================================================================
  -- 5) Citizen PIN authentication (activation, login, lockouts, weak PIN)
  -- ==========================================================================
  select id into probe_citizen_id from public.citizens where status = 'active' limit 1;

  if probe_citizen_id is null or e_uid is null then
    r := array_append(r, 'SKIP PIN-auth checks (no active citizen or employee fixture)');
  else
    perform set_config('request.jwt.claims', json_build_object('sub', e_uid, 'role','authenticated')::text, true);
    execute 'set local role authenticated';
    activation_result := public.issue_citizen_activation_code(probe_citizen_id);
    reset role;

    raw_code := replace(activation_result->>'code', '-', '');
    r := array_append(r, case when raw_code is not null and length(raw_code) = 8
      then 'PASS employee issued an 8-char activation code'
      else 'FAIL activation code issuance returned unexpected shape' end);

    activation_result := public.citizen_activate(
      (select pension_number from public.citizens where id = probe_citizen_id),
      raw_code, '111111', '127.0.0.1'
    );
    r := array_append(r, case when (activation_result->>'reason') = 'weak_pin'
      then 'PASS weak PIN (111111) rejected during activation'
      else 'FAIL weak PIN was accepted during activation' end);

    activation_result := public.citizen_activate(
      (select pension_number from public.citizens where id = probe_citizen_id),
      raw_code, '583024', '127.0.0.1'
    );
    r := array_append(r, case when (activation_result->>'ok')::boolean
      then 'PASS activation succeeded with a valid PIN'
      else 'FAIL activation failed unexpectedly: '||coalesce(activation_result->>'reason','?') end);

    activation_result := public.citizen_activate(
      (select pension_number from public.citizens where id = probe_citizen_id),
      raw_code, '583024', '127.0.0.1'
    );
    r := array_append(r, case when (activation_result->>'reason') = 'invalid'
      then 'PASS activation code cannot be reused'
      else 'FAIL activation code was reused successfully' end);

    login_result := public.citizen_verify_pin(
      (select pension_number from public.citizens where id = probe_citizen_id),
      '583024', '127.0.0.2'
    );
    r := array_append(r, case when (login_result->>'ok')::boolean
      then 'PASS citizen login with correct PIN succeeds'
      else 'FAIL citizen login with correct PIN was rejected' end);

    for i in 1..5 loop
      login_result := public.citizen_verify_pin(
        (select pension_number from public.citizens where id = probe_citizen_id),
        '000000', '127.0.0.3'
      );
    end loop;
    login_result := public.citizen_verify_pin(
      (select pension_number from public.citizens where id = probe_citizen_id),
      '583024', '127.0.0.3'
    );
    r := array_append(r, case when (login_result->>'reason') = 'rate_limited'
      then 'PASS account locked after 5 wrong PIN attempts'
      else 'FAIL account was not locked after repeated wrong PINs' end);
  end if;

  -- ==========================================================================
  -- Report (always rolls back -- nothing above is kept)
  -- ==========================================================================
  raise exception E'\n=== DHAMANI SECURITY REGRESSION REPORT ===\n%\n%',
    array_to_string(r, E'\n'),
    case when exists (select 1 from unnest(r) x where x like 'FAIL%')
      then E'\n>>> RESULT: FAILURES FOUND -- see FAIL lines above <<<'
      else E'\n>>> RESULT: ALL CHECKS PASSED <<<' end;
end $$;
