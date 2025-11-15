-- Phase 2: RLS 정책 테스트용 SQL (참고용)
-- 주의: 이 스크립트는 Supabase SQL Editor에서 실행하여 권한 동작을 확인하는 용도입니다
-- 실제 운영 환경에서는 이 스크립트를 실행하지 마세요.

-- 1. 테스트용 사용자 ID 확인 (GitHub 로그인 후 auth.users에서 확인)
-- select id, email from auth.users;

-- 2. 테스트 데이터 삽입 (본인으로 로그인한 상태에서만 가능)
-- insert into public.notes (user_id, title, content) 
-- values (
--   auth.uid(), 
--   '테스트 문서',
--   '[{"type": "paragraph", "content": "테스트 내용"}]'::jsonb
-- );

-- 3. 본인 문서 조회 (삭제되지 않은 문서만 조회됨)
-- select * from public.notes 
-- where user_id = auth.uid() and is_deleted = false;

-- 4. 소프트 삭제 테스트
-- update public.notes 
-- set is_deleted = true 
-- where id = 'your_note_id_here' and user_id = auth.uid();

-- 5. 권한 테스트 (다른 사용자의 문서는 조회되지 않아야 함)
-- select * from public.notes; -- 본인 문서만 보여야 함

-- 6. 수정 테스트
-- update public.notes 
-- set title = '수정된 제목', updated_at = now()
-- where id = 'your_note_id_here' and user_id = auth.uid();

-- 확인 사항:
-- - 로그인하지 않은 상태에서는 어떤 데이터도 조회/수정/삽입 불가
-- - 로그인한 사용자는 본인의 문서만 조회/수정 가능
-- - is_deleted=true인 문서는 조회되지 않음
-- - 다른 사용자의 문서는 조회/수정 불가

