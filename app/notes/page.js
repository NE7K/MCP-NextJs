'use client';

import Link from 'next/link';
import styles from './NotesPage.module.css';

export default function NotesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>환영합니다!</h1>
        <Link href="/notes/new" className={styles.newButton}>
          새 문서 작성
        </Link>
      </div>
      <section className={styles.empty}>
        <p>좌측 사이드바에서 내 문서를 확인하고, 새 문서를 작성해 보세요.</p>
      </section>
    </main>
  );
}
