import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 서버 사이드에서 사용하는 Supabase 클라이언트
 * Next.js App Router의 Route Handler, Server Component에서 사용
 * 쿠키에서 인증 세션을 읽어옵니다.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // 쿠키 설정은 Route Handler에서만 가능
          // Server Component에서는 읽기 전용
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // 쿠키 삭제는 Route Handler에서만 가능
        }
      },
    },
  });
}

