-- Add DELETE policy and fix UPDATE policy for soft delete
-- This ensures users can delete their own notes (both hard and soft delete)

-- 1. Add DELETE policy for hard delete (if needed in the future)
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notes'
      and policyname = 'delete_own_notes'
  ) then
    execute 'drop policy "delete_own_notes" on public.notes';
  end if;
end;
$$;

create policy "delete_own_notes"
  on public.notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. Fix UPDATE policy to explicitly allow is_deleted changes
-- The using clause should allow selecting rows where is_deleted = false
-- The with_check clause should allow setting is_deleted = true
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

-- Update policy: allow owners to update their notes (including soft delete)
-- using: select rows where user owns them (regardless of is_deleted status)
-- Note: without with_check, Supabase uses the same condition as using clause
-- This allows setting is_deleted = true (soft delete) without RLS violation
create policy "update_own_notes"
  on public.notes
  for update
  to authenticated
  using (auth.uid() = user_id);

