import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';

/**
 * GET /api/notes/[id]
 * 문서 상세 조회
 */
export async function GET(request, { params }) {
  try {
    const supabase = await getSupabaseServerClient();
    const { id } = params;

    // 인증 확인 (서버에서 신뢰 가능한 방식)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // UUID 유효성 검사 (간단한 형식 체크)
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Bad request', message: '잘못된 문서 ID입니다.' },
        { status: 400 }
      );
    }

    // 문서 조회 (RLS 정책에 의해 본인 문서만 조회 가능)
    const { data: note, error } = await supabase
      .from('notes')
      .select('id, title, content, created_at, updated_at')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      // 문서를 찾을 수 없는 경우 (권한 없음 또는 존재하지 않음)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found', message: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      console.error('Error fetching note:', error);
      return NextResponse.json(
        { error: 'Database error', message: '문서를 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: note }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 * 문서 수정 (title, content, updated_at 갱신)
 */
export async function PATCH(request, { params }) {
  try {
    const supabase = await getSupabaseServerClient();
    const { id } = params;

    // 인증 확인 (서버에서 신뢰 가능한 방식)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // UUID 유효성 검사
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Bad request', message: '잘못된 문서 ID입니다.' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { title, content } = body;

    // 업데이트할 필드 구성
    const updateData = {};
    
    if (title !== undefined) {
      if (typeof title !== 'string') {
        return NextResponse.json(
          { error: 'Validation error', message: '제목은 문자열이어야 합니다.' },
          { status: 400 }
        );
      }
      updateData.title = title.trim() || '제목 없음';
    }

    if (content !== undefined) {
      if (!Array.isArray(content)) {
        return NextResponse.json(
          { error: 'Validation error', message: '내용은 배열(블록 배열)이어야 합니다.' },
          { status: 400 }
        );
      }
      updateData.content = content;
    }

    // 업데이트할 필드가 없는 경우
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Bad request', message: '수정할 필드가 없습니다.' },
        { status: 400 }
      );
    }

    // updated_at는 트리거 또는 명시적으로 설정
    updateData.updated_at = new Date().toISOString();

    // 문서 수정 (RLS 정책에 의해 본인 문서만 수정 가능)
    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select('id, title, content, created_at, updated_at')
      .single();

    if (error) {
      // 문서를 찾을 수 없는 경우 (권한 없음 또는 존재하지 않음)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found', message: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Database error', message: '문서 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: note }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/notes/[id]:', error);
    
    // JSON 파싱 오류 처리
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Bad request', message: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * 문서 소프트 삭제 (is_deleted=true)
 */
export async function DELETE(request, { params }) {
  try {
    const supabase = await getSupabaseServerClient();
    const { id } = params;

    // 인증 확인 (서버에서 신뢰 가능한 방식)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // UUID 유효성 검사
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Bad request', message: '잘못된 문서 ID입니다.' },
        { status: 400 }
      );
    }

    // 소프트 삭제 (is_deleted=true로 업데이트)
    // 주의: 업데이트 후 select를 하면 RLS 정책(is_deleted=false) 때문에 0행이 반환되어 에러가 발생할 수 있음
    // 따라서 select/single 없이 성공 여부만 확인한다.
    const { error } = await supabase
      .from('notes')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false)
      ;

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: 'Not found', message: '문서를 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: '문서가 삭제되었습니다.', data: { id } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

