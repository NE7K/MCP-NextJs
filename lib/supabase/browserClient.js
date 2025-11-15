import { createBrowserClient } from '@supabase/ssr';

let browserClient = null;

export function getSupabaseBrowserClient() {
  // 브라우저에서만 실행되도록 체크
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient can only be used in the browser');
  }

  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // 의도적으로 runtime 에러를 던져 환경변수 누락을 조기 발견
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}


