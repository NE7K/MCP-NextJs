'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { extractTitleFromBlocks } from '@/components/editor/BlockEditor';

// BlockEditor를 동적 import로 로드 (SSR 방지)
const BlockEditor = dynamic(
  () => import('@/components/editor/BlockEditor'),
  { ssr: false }
);

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params?.id;

  const [note, setNote] = useState(null);
  const [blocks, setBlocks] = useState(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // 문서 로드
  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`/api/notes/${noteId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('문서를 찾을 수 없습니다.');
          }
          throw new Error('문서를 불러오는 중 오류가 발생했습니다.');
        }

        const data = await response.json();
        setNote(data.data);
        
        // content를 블록 배열로 설정 (없으면 빈 배열)
        setBlocks(data.data.content || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || '문서를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);

  const handleContentChange = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    setError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!blocks) {
      setError('내용을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // 첫 번째 블록에서 제목 추출
      const title = extractTitleFromBlocks(blocks);

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
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
        throw new Error(data.message || '문서 수정에 실패했습니다.');
      }

      const data = await response.json();
      setNote(data.data);
      setIsEditing(false);

      // Sidebar 목록 새로고침을 위해 페이지 리프레시
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || '문서 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [blocks, noteId, router]);

  const handleDelete = useCallback(async () => {
    if (!confirm('정말 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setDeleting(true);
      setError('');

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '문서 삭제에 실패했습니다.');
      }

      // 삭제 성공 시 목록 페이지로 이동
      router.push('/notes');
      router.refresh();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || '문서 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  }, [noteId, router]);

  if (loading) {
    return (
      <main className="note-page">
        <div className="loading">로딩 중...</div>
        <style jsx>{`
          .note-page {
            padding: 48px 24px;
            text-align: center;
          }
          .loading {
            color: #666;
          }
        `}</style>
      </main>
    );
  }

  if (error && !note) {
    return (
      <main className="note-page">
        <div className="error">{error}</div>
        <button onClick={() => router.push('/notes')} className="back-button">
          목록으로 돌아가기
        </button>
        <style jsx>{`
          .note-page {
            padding: 48px 24px;
            text-align: center;
          }
          .error {
            color: #d32f2f;
            margin-bottom: 24px;
          }
          .back-button {
            padding: 10px 20px;
            background: #1976d2;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }
        `}</style>
      </main>
    );
  }

  const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );

  return (
    <main className="note-page">
      <div className="note-header">
        <div className="note-actions">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="save-button"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // 원본 내용으로 복원
                  setBlocks(note.content || []);
                  setError('');
                }}
                disabled={saving}
                className="cancel-button"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="icon-button primary"
                aria-label="수정"
                title="수정"
              >
                <EditIcon />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="icon-button danger"
                aria-label="삭제"
                title="삭제"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      {note && (
        <BlockEditor
          initialContent={blocks}
          onChange={handleContentChange}
          editable={isEditing}
        />
      )}

      <style jsx>{`
        .note-page {
          width: 100%;
          min-height: 100vh;
          background: #fff;
        }
        .note-header {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 100;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .note-actions {
          display: flex;
          gap: 8px;
        }
        .save-button,
        .edit-button {
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
        .save-button:hover:not(:disabled),
        .icon-button.primary:hover {
          background: #1565c0;
        }
        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cancel-button {
          padding: 10px 20px;
          background: #fff;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .cancel-button:hover:not(:disabled) {
          background: #f5f5f5;
        }
        .icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid #ddd;
          background: #fff;
          color: #444;
          cursor: pointer;
        }
        .icon-button.primary {
          border-color: #1976d2;
          color: #1976d2;
        }
        .icon-button.danger {
          border-color: #d32f2f;
          color: #d32f2f;
        }
        .icon-button:disabled {
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

