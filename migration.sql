-- =============================================
-- Migration: user_id 컬럼 추가 + RLS 정책 교체
-- 기존 DB에서 실행 (Supabase Dashboard > SQL Editor)
-- 주의: 기존 데이터가 모두 삭제됩니다
-- =============================================

-- 기존 테이블 제거 후 재생성
DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS groups;

-- groups 테이블
CREATE TABLE groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- todos 테이블
CREATE TABLE todos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  group_id     UUID REFERENCES groups(id) ON DELETE SET NULL,
  user_id      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security 활성화
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos  ENABLE ROW LEVEL SECURITY;

-- 사용자별 데이터 격리 정책
CREATE POLICY "user isolation" ON groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user isolation" ON todos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
