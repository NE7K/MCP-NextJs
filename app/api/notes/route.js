import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';

/**
 * GET /api/notes
 * 본인 문서 목록 조회 (is_deleted=false, 최신순)
 */
export async function GET(request) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // 인증 확인 (서버에서 신뢰 가능한 방식)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 본인 문서 목록 조회 (RLS 정책에 의해 자동으로 필터링됨)
    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, title, content, created_at, updated_at')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Database error', message: '문서 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: notes || [] }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * 새 문서 생성
 */
export async function POST(request) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // 인증 확인 (서버에서 신뢰 가능한 방식)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { title = '', content = [] } = body;

    // 유효성 검사
    if (typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', message: '제목은 문자열이어야 합니다.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(content)) {
      return NextResponse.json(
        { error: 'Validation error', message: '내용은 배열(블록 배열)이어야 합니다.' },
        { status: 400 }
      );
    }

    // 문서 생성 (RLS 정책: user_id = auth.uid() 필요)
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: title.trim() || '제목 없음',
        content: content,
      })
      .select('id, title, content, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json(
        { error: 'Database error', message: '문서 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/notes:', error);
    
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

