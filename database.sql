-- =============================================
-- TODO List - Supabase DB 생성 스크립트
-- Supabase Dashboard > SQL Editor에서 실행
-- =============================================

-- 1. groups 테이블
CREATE TABLE groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. todos 테이블
CREATE TABLE todos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  group_id     UUID REFERENCES groups(id) ON DELETE SET NULL,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security 활성화
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos  ENABLE ROW LEVEL SECURITY;

-- 4. 공개 접근 허용 정책 (인증 없이 누구나 읽기/쓰기 가능)
--    인증이 필요하다면 아래 정책 대신 auth.uid() 기반 정책으로 교체
CREATE POLICY "allow all" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON todos  FOR ALL USING (true) WITH CHECK (true);
