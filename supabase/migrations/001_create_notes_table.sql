-- Phase 2: notes 테이블 및 RLS 정책 생성
-- 실행 방법: Supabase 대시보드 > SQL Editor에서 실행하거나, Supabase CLI로 마이그레이션

-- 1. notes 테이블 생성
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content jsonb not null default '[]'::jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스 추가 (성능 최적화)
create index if not exists idx_notes_user_id on public.notes(user_id);
create index if not exists idx_notes_user_id_not_deleted on public.notes(user_id, is_deleted) where is_deleted = false;
create index if not exists idx_notes_updated_at on public.notes(updated_at desc);

-- 2. RLS 활성화
alter table public.notes enable row level security;

-- 3. RLS 정책 생성

-- 본인 문서 조회 (삭제되지 않은 문서만)
create policy "select_own_notes"
  on public.notes
  for select
  using (auth.uid() = user_id and is_deleted = false);

-- 본인으로 insert
create policy "insert_own_notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

-- 본인 문서 update(수정/소프트삭제)
create policy "update_own_notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. updated_at 자동 갱신 트리거 함수 (선택사항, 앱 레벨에서도 처리 가능)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_notes_updated_at
  before update on public.notes
  for each row
  execute function public.update_updated_at_column();

-- 주의사항:
-- - updated_at는 트리거로도 갱신되지만, 앱 레벨에서도 명시적으로 갱신하는 것을 권장
-- - RLS 정책은 인증된 사용자만 자신의 문서에 접근할 수 있도록 보장합니다

