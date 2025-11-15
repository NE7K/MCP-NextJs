# Supabase 마이그레이션 가이드

이 디렉토리는 Supabase 데이터베이스 스키마 마이그레이션 파일을 포함합니다.

## Phase 2: DB 스키마 및 RLS 정책 설정

### 1. Supabase 프로젝트 준비

1. [Supabase 대시보드](https://app.supabase.com)에 로그인
2. 프로젝트 생성 (또는 기존 프로젝트 선택)
3. 프로젝트 설정에서 API URL과 Anon Key 확인하여 `.env.local`에 설정

### 2. SQL 실행 방법

#### 방법 1: Supabase 대시보드 SQL Editor 사용 (권장)

1. Supabase 대시보드 > SQL Editor 메뉴로 이동
2. `migrations/001_create_notes_table.sql` 파일의 내용을 복사
3. SQL Editor에 붙여넣고 실행 (Run 버튼 클릭)
4. 성공 메시지 확인

#### 방법 2: Supabase CLI 사용 (선택사항)

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

### 3. 확인 사항

마이그레이션 실행 후 다음을 확인하세요:

1. **테이블 생성 확인**
   - SQL Editor에서 실행: `SELECT * FROM public.notes LIMIT 0;`
   - 또는 Table Editor에서 `notes` 테이블이 생성되었는지 확인

2. **RLS 정책 확인**
   - SQL Editor에서 실행: `SELECT * FROM pg_policies WHERE tablename = 'notes';`
   - 다음 3개의 정책이 있어야 함:
     - `select_own_notes`
     - `insert_own_notes`
     - `update_own_notes`

3. **인덱스 확인**
   - SQL Editor에서 실행: `SELECT indexname FROM pg_indexes WHERE tablename = 'notes';`

### 4. 권한 테스트 (선택사항)

`migrations/002_test_rls_policies.sql` 파일의 주석을 참고하여 RLS 정책이 올바르게 동작하는지 테스트할 수 있습니다.

**테스트 방법:**
1. GitHub로 로그인하여 인증 세션 생성
2. SQL Editor에서 테스트 쿼리 실행 (주석 해제 후)
3. 본인 문서만 조회/수정 가능한지 확인
4. 로그아웃 후 조회 불가능한지 확인

### 5. 트러블슈팅

**문제: "permission denied for table notes"**
- RLS가 활성화되어 있지만 정책이 없거나 잘못 설정된 경우
- `001_create_notes_table.sql`을 다시 실행하여 정책 재생성

**문제: "foreign key constraint fails"**
- `auth.users` 테이블에 해당 사용자가 없는 경우
- GitHub 로그인을 먼저 완료한 후 테스트 진행

**문제: "policy already exists"**
- 정책이 이미 존재하는 경우
- `DROP POLICY IF EXISTS policy_name ON public.notes;` 실행 후 재생성

## 다음 단계

Phase 2 완료 후 Phase 3 (API 라우트 구현)으로 진행하세요.

