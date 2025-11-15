'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browserClient';
import styles from './Sidebar.module.css';

// SVG 아이콘 컴포넌트
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 클라이언트에서만 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, []);

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  useEffect(() => {
    // 브라우저에서만 실행
    if (!mounted || typeof window === 'undefined') return;

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (error) {
      console.error('Failed to get Supabase client:', error);
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchNotes();
        } else {
          setNotes([]);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // 초기 세션 확인
    checkSession();

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchNotes();
      } else {
        setNotes([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [mounted, fetchNotes]);

  const handleSignOut = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (typeof window === 'undefined') return;
    
    console.log('Sidebar 로그아웃 버튼 클릭됨');
    
    try {
      const supabase = getSupabaseBrowserClient();
      console.log('로그아웃 시작...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('로그아웃 에러:', error);
        throw error;
      }
      
      console.log('로그아웃 성공');
      setUser(null);
      setNotes([]);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('로그아웃 에러:', error);
      alert('로그아웃에 실패했습니다: ' + (error?.message || '알 수 없는 오류'));
    }
  }, [router]);

  // 로그인 페이지에서는 Sidebar 숨김
  if (pathname === '/login') {
    return null;
  }

  // 로딩 중이거나 로그인하지 않은 경우
  if (loading || !user) {
    return null;
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navLinks = [
    { href: '/notes', label: '문서 목록', icon: <FileIcon /> },
    { href: '/notes/new', label: '새 문서 작성', icon: <PlusIcon /> },
  ];

  return (
    <>
      {/* 토글 버튼 (항상 표시) */}
      <button 
        className={`${styles.toggleButton} ${isOpen ? styles.toggleButtonOpen : ''}`}
        onClick={toggleSidebar}
        aria-label={isOpen ? '사이드바 닫기' : '사이드바 열기'}
      >
        {isOpen ? <XIcon /> : <MenuIcon />}
      </button>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarContent}>
          {/* 사용자 프로필 영역 */}
          <div className={styles.userSection}>
            <div className={styles.userAvatar}>
              <UserIcon />
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user.email?.split('@')[0] || user.id?.substring(0, 8) || 'User'}
              </div>
              <button 
                type="button"
                className={styles.logoutButton}
                onClick={handleSignOut}
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* 네비게이션 링크 */}
          <nav className={styles.navSection}>
            <ul className={styles.navList}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
                  >
                    <span className={styles.navIcon}>{link.icon}</span>
                    <span className={styles.navLabel}>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 내 문서 목록 */}
          <div className={styles.notesSection}>
            <div className={styles.notesSectionHeader}>
              <h3 className={styles.notesSectionTitle}>내 문서</h3>
            </div>
            <div className={styles.notesList}>
              {notes.length === 0 ? (
                <div className={styles.emptyNotes}>작성한 문서가 없습니다.</div>
              ) : (
                notes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className={`${styles.noteItem} ${pathname === `/notes/${note.id}` ? styles.noteItemActive : ''}`}
                  >
                    <span className={styles.noteIcon}>
                      <FileIcon />
                    </span>
                    <span className={styles.noteTitle}>
                    {note.title || '제목 없음'}
                    </span>
                  <span className={styles.noteDate}>
                    {formatShortDate(note.updated_at)}
                  </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

