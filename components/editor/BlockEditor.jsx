'use client';

import { useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import styles from './BlockEditor.module.css';

/**
 * BlockNote 에디터 컴포넌트
 * @param {Object} props
 * @param {Array} props.initialContent - 초기 콘텐츠 (블록 배열)
 * @param {Function} props.onChange - 콘텐츠 변경 콜백
 * @param {Boolean} props.editable - 편집 가능 여부 (기본: true)
 */
export default function BlockEditor({ initialContent = undefined, onChange, editable = true }) {
  const onChangeRef = useRef(onChange);
  
  // onChange ref 업데이트
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 에디터 초기화
  const editor = useCreateBlockNote({
    initialContent: initialContent,
  });

  // 콘텐츠 변경 감지 - BlockNote 0.42에서는 editor의 onChange 메서드 사용
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      try {
        const blocks = editor.topLevelBlocks;
        if (onChangeRef.current) {
          onChangeRef.current(blocks);
        }
      } catch (error) {
        console.error('Error in onChange handler:', error);
      }
    };

    // BlockNote 0.42의 onChange는 이벤트 리스너를 등록하는 함수
    // unsubscribe 함수를 반환할 수 있음
    let unsubscribe;
    if (editor.onChange && typeof editor.onChange === 'function') {
      unsubscribe = editor.onChange(handleChange);
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [editor]);

  // initialContent가 변경되면 에디터 업데이트
  useEffect(() => {
    if (editor && initialContent !== undefined && initialContent !== null) {
      try {
        editor.replaceBlocks(editor.topLevelBlocks, initialContent);
      } catch (error) {
        console.error('Error updating editor content:', error);
      }
    }
  }, [editor, initialContent]);

  return (
    <div className={styles.editorWrapper}>
      <BlockNoteView editor={editor} theme="light" className={styles.editor} editable={editable} />
    </div>
  );
}

/**
 * 첫 번째 블록에서 텍스트를 추출하여 제목으로 사용
 * @param {Array} blocks - BlockNote 블록 배열
 * @returns {string} - 추출된 제목
 */
export function extractTitleFromBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return '';
  }

  // 첫 번째 블록의 텍스트 추출
  const firstBlock = blocks[0];
  
  if (firstBlock.content) {
    // content가 배열인 경우 (리치 텍스트)
    if (Array.isArray(firstBlock.content)) {
      return firstBlock.content
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item.type === 'text' && item.text) {
            return item.text;
          }
          return '';
        })
        .join('')
        .trim()
        .substring(0, 100); // 최대 100자
    }
    // content가 문자열인 경우
    if (typeof firstBlock.content === 'string') {
      return firstBlock.content.trim().substring(0, 100);
    }
  }

  return '';
}

