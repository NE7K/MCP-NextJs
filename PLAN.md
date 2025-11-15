+ 프로젝트 계획: Notion 스타일 문서 앱 (Next.js + Supabase + Blocknote)

## 1) 목표 및 필수 기능
- **깃허브 소셜 로그인**: Supabase Auth GitHub provider 사용
- **글 작성 페이지**: Blocknote 에디터로 블록 기반 작성
- **글 조회 페이지**: 문서 상세 조회
- **글 수정/삭제**: 본인 문서만 수정/삭제(소프트 삭제) 가능

## 2) 기술 스택
- **웹 프레임워크**: Next.js (App Router, JavaScript)
- **데이터베이스/인증**: Supabase (Postgres + Auth + RLS)
- **클라이언트 SDK**: `@supabase/supabase-js`
- **에디터**: Blocknote (`@blocknote/react`, `@blocknote/core`)
- **스타일**: 자유(CSS Modules/ Tailwind 중 택1, 초기에는 최소 구성)
- **배포**: Vercel(프론트) + Supabase(백엔드)

## 3) 시스템 아키텍처 개요
- Next.js App Router 기반 SSR/ISR + 클라이언트 컴포넌트 혼용
- 인증은 Supabase Auth 세션을 사용(서버/클라이언트 모두 접근 가능)
- 데이터 접근은 RLS를 전제로 `supabase-js`로 직접 호출
- CRUD는 Next.js Route Handlers(`/app/api/...`) 또는 Server Actions로 구현
  - MVP는 Route Handlers(RESTful)로 단순화

## 4) 데이터 모델(테이블) 및 RLS
### 4.1 테이블: `public.notes`
- `id` uuid PK (기본값 `gen_random_uuid()`)
- `user_id` uuid not null (FK → `auth.users.id`, on delete cascade)
- `title` text not null default ''
- `content` jsonb not null default `[]` (Blocknote 문서 구조 그대로 저장)
- `is_deleted` boolean not null default false (소프트 삭제)
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

RLS 정책(요지)
- RLS 활성화 후, 본인(`auth.uid()`) 소유 문서에 한해 `select/insert/update` 허용
- 조회는 `is_deleted=false` 조건 하에서만 가능
- 삭제는 update로 `is_deleted=true`로 처리(하드 삭제는 관리자만)

예시 SQL(참고용):

```sql
-- 테이블
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content jsonb not null default '[]'::jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- 본인 문서 조회 (삭제되지 않은 문서만)
create policy "select_own_notes"
  on public.notes for select
  using (auth.uid() = user_id and is_deleted = false);

-- 본인으로 insert
create policy "insert_own_notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

-- 본인 문서 update(수정/소프트삭제)
create policy "update_own_notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

주석
- `updated_at`는 앱 레벨에서 업데이트 시 `now()`로 갱신
- 필요 시 하드 삭제용 관리자 정책은 추후 추가

## 5) 라우팅/화면 구조 (App Router)
- `/` → 로그인 여부에 따라 `/notes` 또는 `/login` 리다이렉트
- `/login` → GitHub 로그인 버튼(로그인 후 `/notes`)
- `/notes` → 문서 목록(최근 수정 순), 새 문서 버튼
- `/notes/new` → 작성 화면(Blocknote 에디터)
- `/notes/[id]` → 조회/편집(보기→편집 토글 또는 바로 인라인 편집)
- `/api/notes` → `GET`(목록), `POST`(생성)
- `/api/notes/[id]` → `GET`(상세), `PATCH`(수정), `DELETE`(소프트 삭제)

권한
- `/login` 제외 전부 보호 라우트(미인증 시 `/login`으로)

## 5.1) 폴더 구조(초안)
```text
/
├─ app/
│  ├─ globals.css
│  ├─ layout.js
│  ├─ page.js                         # 루트: 로그인 여부에 따라 리다이렉트
│  ├─ login/
│  │  └─ page.js                      # GitHub 로그인 버튼 페이지
│  ├─ notes/
│  │  ├─ page.js                      # 문서 목록 페이지
│  │  ├─ new/
│  │  │  └─ page.js                   # 새 문서 작성(에디터)
│  │  └─ [id]/
│  │     └─ page.js                   # 문서 조회/편집
│  └─ api/
│     └─ notes/
│        ├─ route.js                  # GET(목록), POST(생성)
│        └─ [id]/
│           └─ route.js               # GET(상세), PATCH(수정), DELETE(소프트 삭제)
├─ components/
│  ├─ editor/
│  │  └─ BlockEditor.jsx              # Blocknote 에디터 래퍼(동적 import)
│  ├─ notes/
│  │  ├─ NoteList.jsx
│  │  └─ NoteItem.jsx
│  └─ ui/
│     ├─ Button.jsx
│     └─ Spinner.jsx
├─ lib/
│  └─ supabase/
│     ├─ browserClient.js             # 클라이언트에서 사용하는 Supabase 클라이언트
│     └─ serverClient.js              # 서버 컴포넌트/라우트 핸들러용 클라이언트
├─ utils/
│  └─ formatDate.js
├─ public/
│  └─ favicon.ico
├─ .env.local                         # NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (git ignore)
├─ package.json
├─ next.config.js
└─ README.md
```

## 6) 인증(GitHub 소셜 로그인)
- Supabase 프로젝트에서 GitHub provider 활성화
- Callback URL: Vercel 도메인 및 로컬(`http://localhost:3000`) 등록
- Next.js에서 Supabase Auth 세션을 쿠키로 유지
- 클라이언트: `supabase.auth.signInWithOAuth({ provider: 'github' })`

## 7) CRUD 구현 전략
- 생성: 제목/내용(블록 JSON)으로 `POST /api/notes` → 생성 후 `/notes/[id]`로 이동
  - 제목은 첫 번째 블록에서 자동 추출 (`extractTitleFromBlocks()`)
- 조회: 클라이언트 컴포넌트에서 RLS 기반 `GET /api/notes` / `GET /api/notes/[id]`
- 수정: 편집 모드 토글 → 에디터 변경 → 저장 시 `PATCH /api/notes/[id]`
  - 제목은 첫 번째 블록에서 자동 추출하여 업데이트
- 삭제: 확인 다이얼로그 → `DELETE /api/notes/[id]` → `is_deleted=true` 처리(리스트에서 제외)
- 낙관적 UI는 2차 단계에서 적용

## 8) Blocknote 에디터 통합
- 패키지: `@blocknote/react`, `@blocknote/core`, `@blocknote/mantine`
- Next.js에서 SSR 이슈 방지: 동적 import(`ssr:false`)로 클라이언트 전용 로드
- 저장 포맷: Blocknote의 블록 배열(JSON) 그대로 `jsonb` 컬럼에 저장
- 포맷팅 툴바: 텍스트 스타일, 정렬, 링크, 리스트 기능 포함
- 제목 자동 추출: 첫 번째 블록의 텍스트를 자동으로 `title` 필드에 저장 (최대 100자)
- 기본 툴바/단축키로 MVP 구성(추후 커스텀 블록/메뉴 확장)

## 9) 환경변수 및 설정
- `.env.local`
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
  - (선택) 서버 전용 키는 로컬 유틸/배치에서만 사용, 클라이언트에 노출 금지
- Supabase RLS 활성화 필수
- GitHub OAuth 앱 설정(Client ID/Secret) → Supabase에 등록

## 10) 개발 단계(Phases)
### Phase 0: 프로젝트 초기 설정
- Next.js(App Router, JavaScript) 프로젝트 생성
- 의존성 설치: `@supabase/supabase-js`, `@blocknote/react`, `@blocknote/core`
- 기본 레이아웃(`app/layout.js`), 전역 스타일(`app/globals.css`) 구성
- `lib/supabase/browserClient.js`, `lib/supabase/serverClient.js` 초안 작성
- `.env.local` 템플릿 추가 및 git ignore 확인
- 완료 기준: 로컬에서 `/` 페이지 렌더링, 빌드/개발서버 정상 동작

### Phase 1: 인증(GitHub) 연동 및 보호 라우팅 골격
- Supabase 프로젝트 생성, GitHub Provider 활성화, Redirect URL 등록
- 로그인 페이지(`app/login/page.js`)에 GitHub 로그인 버튼 구현
- 헤더/내비게이션에 로그인/로그아웃 상태 표시(필요 시 간단한 헤더)
- 서버/클라이언트에서 세션 접근 가능하도록 supabase 클라이언트 연결
- 미인증 접근 시 `/login` 리다이렉션 처리 골격(서버 컴포넌트 가드 또는 미들웨어)
- 완료 기준: 로그인/로그아웃이 가능하고 인증 세션이 유지됨

### Phase 2: DB 스키마 및 RLS 정책
- `public.notes` 테이블 생성(SQL 실행)
- RLS 활성화 및 정책(own select/insert/update, is_deleted=false 조회) 적용
- 로컬에서 Auth 사용자로 CRUD 권한 동작 여부 테스트
- 완료 기준: 인증 사용자만 자신의 노트에 접근 가능함을 확인

### Phase 3: API 라우트 구현
- `app/api/notes/route.js`: 
  - `GET` 목록(본인 문서, is_deleted=false, 최신순) 
  - `POST` 생성(title, content jsonb)
- `app/api/notes/[id]/route.js`:
  - `GET` 상세 
  - `PATCH` 수정(title, content, updated_at 갱신) 
  - `DELETE` 소프트 삭제(is_deleted=true)
- 에러 응답 규격화(HTTP 코드/메시지), 서버 로깅 기본화
- 완료 기준: Postman/Thunder Client로 API 단독 테스트 통과

### Phase 4: Blocknote 에디터 통합 ✅
**구현 완료:**
- `components/editor/BlockEditor.jsx` 작성
  - 동적 import로 SSR 방지 (`ssr: false`)
  - 포맷팅 툴바 활성화 (bold, italic, underline, strike, textAlign, link, nest, unnest)
  - 깔끔한 에디터 UI (에디터만 표시, 최소한의 UI)
  - `extractTitleFromBlocks()` 함수로 첫 번째 블록에서 제목 자동 추출
- `/notes/new` 페이지 구현
  - BlockNote 에디터로 작성
  - 저장 버튼으로 `POST /api/notes` 호출
  - 첫 번째 블록을 제목으로 자동 변환하여 저장
  - 저장 성공 시 `/notes/[id]`로 이동
- 완료 기준: ✅ 새 문서 작성이 가능하고 DB에 JSON 블록이 저장됨

**추가 구현 사항:**
- 첫 번째 블록 자동 제목 변환 기능
  - 첫 번째 블록의 텍스트를 추출하여 `title` 필드에 저장
  - 최대 100자까지 추출
  - 리치 텍스트(배열) 및 일반 텍스트 모두 지원
- 포맷팅 툴바 커스터마이징
  - 텍스트 스타일: bold, italic, underline, strike
  - 텍스트 정렬: textAlign
  - 링크: link
  - 리스트: nest, unnest

### Phase 5: 페이지 구현(목록/상세/편집/삭제) ✅
**구현 완료:**
- `/notes` 목록 페이지
  - 클라이언트 컴포넌트에서 `GET /api/notes` 호출
  - 문서 목록 표시 (제목, 수정 날짜)
  - 빈 상태 처리 ("작성한 문서가 없습니다.")
  - 로딩 및 에러 상태 UI
  - 날짜 포맷팅 (오늘, 어제, N일 전, 또는 날짜)
- `/notes/[id]` 상세/편집 페이지
  - 조회 모드: 읽기 전용 에디터
  - 편집 모드: 편집 가능한 에디터 (수정 버튼 클릭 시)
  - 수정 시 `PATCH /api/notes/[id]` 호출
  - 삭제 시 확인 모달 후 `DELETE /api/notes/[id]` 호출
  - 삭제 성공 시 `/notes`로 이동
  - 첫 번째 블록을 제목으로 자동 변환하여 저장
- 완료 기준: ✅ 로그인 후 목록/조회/수정/삭제 전 흐름 완주

**추가 구현 사항:**
- 편집 모드 토글 기능
- 삭제 확인 다이얼로그
- 에러 처리 및 사용자 피드백

### Phase 6: 접근 제어/UX 다듬기 ✅
**구현 완료:**
- 보호 라우팅 (`middleware.js`)
  - Next.js 미들웨어로 라우트 보호
  - `/notes` 경로는 로그인 필수
  - 로그인하지 않은 사용자는 `/login`으로 리다이렉트
  - 로그인한 사용자는 `/login`에서 `/notes`로 리다이렉트
- 에러 처리
  - 404 에러 처리 (문서를 찾을 수 없습니다.)
  - API 에러 처리 및 사용자 피드백
  - 빈 상태 UI (작성한 문서가 없습니다.)
- UX 개선
  - 로딩 상태 표시
  - 에러 메시지 표시
  - 확인 다이얼로그 (삭제 시)
- 완료 기준: ✅ 비정상 플로우에서도 사용자 피드백이 명확

### Phase 7: 배포/운영
- Vercel에 배포, 환경변수 설정(Supabase URL/Anon Key)
- 도메인/Callback URL 최종 확정
- 기본 모니터링(에러 로깅 콘솔/알림)과 간단한 체크리스트 수행
- 완료 기준: 프로덕션 URL에서 로그인~CRUD 전체 시나리오 성공

## 11) 배포/운영
- 프론트: Vercel에 Git 연동 자동 배포
- 백엔드: Supabase(호스팅 DB/Auth) 사용
- 환경변수: Vercel 프로젝트에 동일 값 설정
- 보안: RLS 정책, 키 노출 방지, 최소 권한 원칙

## 12) 향후 확장
- 공유 링크(읽기 전용), 태그/폴더, 즐겨찾기, 전체 검색(텍스트/블록)
- 협업 편집(실시간 Presence/CRDT), 버전 히스토리, 이미지/파일 업로드
- 모바일 대응, 키보드 단축키 확장, 사용자 프로필/아바타

## 13) 간단한 설치 메모(참고)
```bash
npm i @supabase/supabase-js @supabase/ssr @blocknote/react @blocknote/core @blocknote/mantine
# 스타일 프레임워크가 필요하면 이후에 추가(Tailwind 등)
```

**설치된 패키지:**
- `@supabase/supabase-js`: Supabase 클라이언트 SDK
- `@supabase/ssr`: Supabase SSR 지원 (서버 사이드 인증)
- `@blocknote/react`: BlockNote React 컴포넌트
- `@blocknote/core`: BlockNote 코어 라이브러리
- `@blocknote/mantine`: BlockNote Mantine UI (선택사항, 향후 확장용)

```bash
# 개발 서버
npm run dev
```


### 참고자료
- [Blocknote 에디터 설치방법](https://www.blocknotejs.org/docs/getting-started)
- [Blocknote 에디터 툴바 설정](https://www.blocknotejs.org/examples/ui-components/formatting-toolbar-buttons)
- [Blocknote 에디터 저장기능](https://www.blocknotejs.org/examples/backend/saving-loading)
- [Blocknote 에디터 저장기능2](https://www.blocknotejs.org/docs/foundations/supported-formats) 