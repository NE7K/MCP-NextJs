'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { extractTitleFromBlocks } from '@/components/editor/BlockEditor';

// BlockEditor를 동적 import로 로드 (SSR 방지)
const BlockEditor = dynamic(
  () => import('@/components/editor/BlockEditor'),
  { ssr: false }
);

export default function NewNotePage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContentChange = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    setError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!blocks || blocks.length === 0) {
      setError('내용을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // 첫 번째 블록에서 제목 추출
      const title = extractTitleFromBlocks(blocks);

      // API 호출
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || '제목 없음',
          content: blocks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '문서 저장에 실패했습니다.');
      }

      const data = await response.json();
      
      // 저장 성공 시 상세 페이지로 이동
      router.push(`/notes/${data.data.id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || '문서 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [blocks, router]);

  return (
    <main className="editor-page">
      <div className="editor-header">
        <button
          onClick={handleSave}
          disabled={saving}
          className="save-button"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
      <BlockEditor
        initialContent={undefined}
        onChange={handleContentChange}
        editable={true}
      />
      <style jsx>{`
        .editor-page {
          width: 100%;
          min-height: 100vh;
          background: #fff;
        }
        .editor-header {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 100;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .save-button {
          padding: 10px 20px;
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .save-button:hover:not(:disabled) {
          background: #1565c0;
        }
        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          color: #d32f2f;
          font-size: 14px;
        }
      `}</style>
    </main>
  );
}

