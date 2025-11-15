'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase/browserClient';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // OAuth 콜백 처리 (URL에 code 파라미터가 있는 경우)
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      if (code) {
        console.log('OAuth 콜백 코드 발견:', code);
        try {
          setLoading(true);
          // Supabase가 자동으로 세션을 설정하도록 기다림
          // 약간의 지연을 두어 세션이 설정될 시간을 줌
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          
          if (data?.session) {
            console.log('세션 확인됨, 리다이렉트 중...');
            // URL에서 code 파라미터 제거
            window.history.replaceState({}, '', '/login');
            router.replace('/notes');
          } else {
            console.log('세션이 아직 설정되지 않음, 재시도...');
            // 재시도
            setTimeout(async () => {
              const { data: retryData } = await supabase.auth.getSession();
              if (retryData?.session) {
                window.history.replaceState({}, '', '/login');
                router.replace('/notes');
              } else {
                setError('로그인 세션을 확인할 수 없습니다. 다시 시도해주세요.');
                setLoading(false);
              }
            }, 1000);
          }
        } catch (err) {
          console.error('콜백 처리 에러:', err);
          setError('로그인 처리 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, router, supabase]);

  useEffect(() => {
    // 이미 로그인 되어 있으면 노트 목록으로 이동
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace('/notes');
      }
    };
    
    checkSession();

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('로그인 성공, 리다이렉트 중...');
        router.replace('/notes');
      } else if (event === 'SIGNED_OUT') {
        console.log('로그아웃됨');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signInWithGitHub = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('로그인 버튼 클릭됨');
    
    try {
      setLoading(true);
      setError('');
      
      console.log('OAuth 로그인 시작...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
        }
      });
      
      console.log('OAuth 응답:', { data, error });
      
      if (error) {
        console.error('OAuth 에러:', error);
        throw error;
      }
      
      // 성공 시 리다이렉트가 자동으로 발생합니다
      // 여기서는 에러만 처리하면 됩니다
      
    } catch (err) {
      console.error('로그인 에러:', err);
      setError(err?.message || '로그인에 실패했습니다.');
      setLoading(false);
    }
    // 리다이렉트가 발생하면 finally는 실행되지 않을 수 있음
  }, [supabase]);

  const signOut = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('로그아웃 버튼 클릭됨');
    
    try {
      console.log('로그아웃 시작...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('로그아웃 에러:', error);
        throw error;
      }
      
      console.log('로그아웃 성공');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('로그아웃 에러:', error);
      alert('로그아웃에 실패했습니다: ' + (error?.message || '알 수 없는 오류'));
    }
  }, [router, supabase]);

  return (
    <main>
      <h1>로그인</h1>
      <p>GitHub 계정으로 로그인하세요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '400px' }}>
        <button 
          type="button"
          onClick={signInWithGitHub} 
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            backgroundColor: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '로그인 중...' : 'GitHub로 로그인'}
        </button>
        <button 
          type="button"
          onClick={signOut} 
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: 0.7
          }}
        >
          로그아웃
        </button>
      </div>
      {error ? <p style={{ color: 'crimson', marginTop: '16px' }}>{error}</p> : null}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main>
        <p>로딩 중...</p>
      </main>
    }>
      <LoginPageContent />
    </Suspense>
  );
}


