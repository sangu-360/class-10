-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Admin Settings Table (for the PIN)
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pin TEXT NOT NULL DEFAULT '831067',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert default PIN if not exists
INSERT INTO admin_settings (pin)
SELECT '831067'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- 1.5 Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Faculties Table
CREATE TABLE IF NOT EXISTS faculties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    dept TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE faculties ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'Atria@2026';

-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
    usn TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    branch TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    section TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    batch_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'Atria@2026';

-- 4. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    scheme TEXT NOT NULL,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Tests Table
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    topic TEXT,
    subject_code TEXT,
    subject_name TEXT,
    faculty_name TEXT,
    faculty_id TEXT,
    subject TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    pass_marks INTEGER NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    target_branch TEXT, -- Optional targeting
    target_section TEXT, -- Optional targeting
    is_review_enabled BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'scheduled', -- 'draft', 'scheduled', 'live', 'completed'
    is_manual_start BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE tests ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS faculty_name TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS faculty_id TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS target_branch TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS target_section TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_review_enabled BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_manual_start BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';

-- 6. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'mcq' or 'coding'
    text TEXT NOT NULL,
    options JSONB, -- Array of strings for MCQs
    correct_answer INTEGER,
    marks INTEGER NOT NULL,
    explanation TEXT,
    initial_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. Test Attempts Table
CREATE TABLE IF NOT EXISTS test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    usn TEXT,
    section TEXT,
    branch TEXT,
    answers JSONB NOT NULL, -- Maps question ID to answer
    status JSONB NOT NULL, -- Maps question ID to QuestionStatus
    score INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    submitted_at BIGINT NOT NULL,
    passed BOOLEAN NOT NULL,
    feedback JSONB, -- Maps question ID to feedback string
    scores JSONB, -- Maps question ID to score number
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS usn TEXT;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS malpractice_count INTEGER DEFAULT 0;

-- 8. Collaboration Requests Table
CREATE TABLE IF NOT EXISTS collaboration_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES faculties(id),
    receiver_id TEXT REFERENCES faculties(id),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 9. Live Sessions Table
CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    current_question_index INTEGER DEFAULT 0,
    answered_count INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(test_id, student_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- Helper to create policy if not exists
DO $$
BEGIN
    -- 1. Admin Settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on admin_settings') THEN
        CREATE POLICY "Allow public read on admin_settings" ON admin_settings FOR SELECT USING (true);
    END IF;

    -- 2. Branches
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on branches') THEN
        CREATE POLICY "Allow public read on branches" ON branches FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on branches') THEN
        CREATE POLICY "Allow insert on branches" ON branches FOR INSERT WITH CHECK (true);
    END IF;

    -- 3. Faculties
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on faculties') THEN
        CREATE POLICY "Allow public read on faculties" ON faculties FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on faculties') THEN
        CREATE POLICY "Allow insert on faculties" ON faculties FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update on faculties') THEN
        CREATE POLICY "Allow update on faculties" ON faculties FOR UPDATE USING (true);
    END IF;

    -- 4. Students
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on students') THEN
        CREATE POLICY "Allow public read on students" ON students FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on students') THEN
        CREATE POLICY "Allow insert on students" ON students FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update on students') THEN
        CREATE POLICY "Allow update on students" ON students FOR UPDATE USING (true);
    END IF;

    -- 5. Subjects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on subjects') THEN
        CREATE POLICY "Allow public read on subjects" ON subjects FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on subjects') THEN
        CREATE POLICY "Allow insert on subjects" ON subjects FOR INSERT WITH CHECK (true);
    END IF;

    -- 6. Tests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on tests') THEN
        CREATE POLICY "Allow public read on tests" ON tests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on tests') THEN
        CREATE POLICY "Allow insert on tests" ON tests FOR INSERT WITH CHECK (true);
    END IF;

    -- 7. Questions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on questions') THEN
        CREATE POLICY "Allow public read on questions" ON questions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on questions') THEN
        CREATE POLICY "Allow insert on questions" ON questions FOR INSERT WITH CHECK (true);
    END IF;

    -- 8. Test Attempts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on test_attempts') THEN
        CREATE POLICY "Allow public read on test_attempts" ON test_attempts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on test_attempts') THEN
        CREATE POLICY "Allow insert on test_attempts" ON test_attempts FOR INSERT WITH CHECK (true);
    END IF;

    -- 9. Collaboration Requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on collaboration_requests') THEN
        CREATE POLICY "Allow public read on collaboration_requests" ON collaboration_requests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on collaboration_requests') THEN
        CREATE POLICY "Allow insert on collaboration_requests" ON collaboration_requests FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update on collaboration_requests') THEN
        CREATE POLICY "Allow update on collaboration_requests" ON collaboration_requests FOR UPDATE USING (true);
    END IF;

    -- 10. Live Sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on live_sessions') THEN
        CREATE POLICY "Allow public read on live_sessions" ON live_sessions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert on live_sessions') THEN
        CREATE POLICY "Allow insert on live_sessions" ON live_sessions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update on live_sessions') THEN
        CREATE POLICY "Allow update on live_sessions" ON live_sessions FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow delete on live_sessions') THEN
        CREATE POLICY "Allow delete on live_sessions" ON live_sessions FOR DELETE USING (true);
    END IF;
END $$;

-- NOTE: These policies are currently permissive (USING true) because the app 
-- uses a custom PIN/Password system instead of Supabase Auth. 
-- To truly secure these, you should migrate to Supabase Auth and use auth.uid().

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

