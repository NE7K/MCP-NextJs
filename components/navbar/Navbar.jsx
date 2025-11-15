'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 확인
    checkSession();

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleSignIn = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/notes` : undefined
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      alert('로그인에 실패했습니다: ' + (error?.message || '알 수 없는 오류'));
    }
  }, [supabase]);

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      alert('로그아웃에 실패했습니다: ' + (error?.message || '알 수 없는 오류'));
    }
  }, [router, supabase]);

  // 로그인 페이지에서는 네비게이션 바 숨김 (선택사항)
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <div className={styles.navbarBrand}>
          <a href="/notes">📝 Notes</a>
        </div>
        
        <div className={styles.navbarMenu}>
          {loading ? (
            <span className={styles.navbarLoading}>로딩 중...</span>
          ) : user ? (
            <>
              <div className={styles.navbarUserInfo}>
                <span className={styles.navbarUserLabel}>사용자:</span>
                <span className={styles.navbarUserEmail}>
                  {user.email || user.user_metadata?.email || user.id?.substring(0, 8) || 'Unknown'}
                </span>
              </div>
              <button 
                className={`${styles.navbarButton} ${styles.navbarButtonLogout}`}
                onClick={handleSignOut}
              >
                로그아웃
              </button>
            </>
          ) : (
            <button 
              className={`${styles.navbarButton} ${styles.navbarButtonLogin}`}
              onClick={handleSignIn}
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

