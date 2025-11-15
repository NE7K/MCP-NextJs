-- Reset all UPDATE policies on public.notes and recreate a single permissive owner-update policy.
-- Use if updates (soft delete) are blocked by an unexpected restrictive policy.

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.notes', pol.policyname);
  end loop;
end;
$$;

-- Recreate a single permissive policy allowing owners to update their rows
create policy "update_own_notes"
  on public.notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


