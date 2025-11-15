-- Ensure RLS update policy allows owners to update (including soft delete)
-- Idempotent: drop existing policy if present, then recreate

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'update_own_notes'
  ) then
    execute 'drop policy "update_own_notes" on public.notes';
  end if;
end;
$$;

create policy "update_own_notes"
  on public.notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: also ensure select policy exists (non-deleted only)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'select_own_notes'
  ) then
    create policy "select_own_notes"
      on public.notes
      for select
      to authenticated
      using (auth.uid() = user_id and is_deleted = false);
  end if;
end;
$$;

-- Insert policy: enforce owner on insert
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'insert_own_notes'
  ) then
    execute 'drop policy "insert_own_notes" on public.notes';
  end if;
end;
$$;

create policy "insert_own_notes"
  on public.notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);


