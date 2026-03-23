import { supabase } from '../lib/supabase';
import { Test, TestAttempt, Faculty, SubjectReg, StudentReg, BranchReg, Role, LiveSession, TestStatus } from '../types';

export const supabaseService = {
  // Admin Settings
  async getAdminPin() {
    const { data, error } = await supabase.from('admin_settings').select('pin').single();
    if (error) {
      console.error('Error fetching admin PIN:', error);
      return '831067'; // fallback
    }
    return data?.pin || '831067';
  },

  async updateAdminPin(newPin: string) {
    const { error } = await supabase.from('admin_settings').update({ pin: newPin }).neq('pin', '');
    if (error) throw error;
  },

  // Branches
  async getBranches() {
    const { data, error } = await supabase.from('branches').select('*').order('name');
    if (error) throw error;
    return data as BranchReg[];
  },

  async addBranch(name: string) {
    const { error } = await supabase.from('branches').insert([{ name }]);
    if (error) throw error;
  },

  // Faculties
  async getFaculties() {
    const { data, error } = await supabase.from('faculties').select('*');
    if (error) throw error;
    return data as Faculty[];
  },

  async addFaculty(faculty: Faculty) {
    const { error } = await supabase.from('faculties').insert([{
      id: faculty.id,
      name: faculty.name,
      email: faculty.email,
      dept: faculty.dept,
      password: faculty.password || 'Atria@2026'
    }]);
    if (error) throw error;
  },

  async addFacultiesBulk(faculties: Faculty[]) {
    const { error } = await supabase.from('faculties').insert(faculties.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      dept: f.dept,
      password: f.password || 'Atria@2026'
    })));
    if (error) throw error;
  },

  // Subjects
  async getSubjects() {
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) throw error;
    return data as SubjectReg[];
  },

  async addSubject(subject: SubjectReg) {
    const { error } = await supabase.from('subjects').insert([{
      name: subject.name,
      code: subject.code,
      scheme: subject.scheme,
      semester: subject.semester,
      academic_year: subject.academicYear
    }]);
    if (error) throw error;
  },

  // Students
  async getStudents() {
    const { data, error } = await supabase.from('students').select('*');
    if (error) throw error;
    return data.map((s: any) => ({
      usn: s.usn,
      name: s.name,
      branch: s.branch,
      email: s.email,
      section: s.section,
      academicYear: s.academic_year,
      batchName: s.batch_name,
      password: s.password
    })) as StudentReg[];
  },

  async addStudent(student: StudentReg) {
    const { error } = await supabase.from('students').insert([{
      usn: student.usn,
      name: student.name,
      branch: student.branch,
      email: student.email,
      section: student.section,
      academic_year: student.academicYear,
      batch_name: student.batchName,
      password: student.password || 'Atria@2026'
    }]);
    if (error) throw error;
  },

  async addStudentsBulk(students: StudentReg[]) {
    const { error } = await supabase.from('students').insert(students.map(s => ({
      usn: s.usn,
      name: s.name,
      branch: s.branch,
      email: s.email,
      section: s.section,
      academic_year: s.academicYear,
      batch_name: s.batchName,
      password: s.password || 'Atria@2026'
    })));
    if (error) throw error;
  },

  // Tests
  async getTests() {
    const { data: testsData, error: testsError } = await supabase.from('tests').select('*');
    if (testsError) throw testsError;

    const { data: questionsData, error: questionsError } = await supabase.from('questions').select('*');
    if (questionsError) throw questionsError;

    return testsData.map((t: any) => ({
      id: t.id,
      title: t.title,
      topic: t.topic,
      subjectCode: t.subject_code,
      subjectName: t.subject_name,
      facultyName: t.faculty_name,
      facultyId: t.faculty_id,
      collaborators: t.collaborators || [],
      subject: t.subject,
      durationMinutes: t.duration_minutes,
      scheduledTime: t.scheduled_time,
      passMarks: t.pass_marks,
      targetBranch: t.target_branch,
      targetSection: t.target_section,
      isReviewEnabled: t.is_review_enabled,
      status: t.status || 'scheduled',
      isManualStart: t.is_manual_start || false,
      questions: questionsData.filter((q: any) => q.test_id === t.id).map((q: any) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswer: q.correct_answer,
        marks: q.marks,
        explanation: q.explanation,
        initialCode: q.initial_code
      }))
    })) as Test[];
  },

  async addTest(test: Test) {
    const { data: testData, error: testError } = await supabase.from('tests').insert([{
      title: test.title,
      topic: test.topic,
      subject_code: test.subjectCode,
      subject_name: test.subjectName,
      faculty_name: test.facultyName,
      faculty_id: test.facultyId,
      collaborators: test.collaborators,
      subject: test.subject,
      duration_minutes: test.durationMinutes,
      scheduled_time: test.scheduledTime,
      pass_marks: test.passMarks,
      target_branch: test.targetBranch,
      target_section: test.targetSection,
      is_review_enabled: test.isReviewEnabled || false,
      status: test.status || 'scheduled',
      is_manual_start: test.isManualStart || false
    }]).select().single();

    if (testError) throw testError;

    const questionsToInsert = test.questions.map(q => ({
      test_id: testData.id,
      type: q.type,
      text: q.text,
      options: q.options,
      correct_answer: q.correctAnswer,
      marks: q.marks,
      explanation: q.explanation,
      initial_code: q.initialCode
    }));

    if (questionsToInsert.length > 0) {
      const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
      if (qError) throw qError;
    }
    
    return testData.id;
  },

  // Authentication
  async login(email: string, password: string): Promise<{ role: Role, name: string, data: any } | null> {
    // Check Faculty
    const { data: faculty, error: fError } = await supabase
      .from('faculties')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    if (faculty) return { role: 'teacher', name: faculty.name, data: faculty };

    // Check Student
    const { data: student, error: sError } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    if (student) return { role: 'student', name: student.name, data: student };

    return null;
  },

  async updatePassword(role: Role, id: string, newPassword: string) {
    const table = role === 'teacher' ? 'faculties' : 'students';
    const idField = role === 'teacher' ? 'id' : 'usn';
    const { error } = await supabase.from(table).update({ password: newPassword }).eq(idField, id);
    if (error) throw error;
  },

  // Attempts
  async getAttempts() {
    const { data, error } = await supabase.from('test_attempts').select('*');
    if (error) throw error;
    return data.map((a: any) => ({
      id: a.id,
      testId: a.test_id,
      studentName: a.student_name,
      usn: a.usn,
      section: a.section,
      branch: a.branch,
      answers: a.answers,
      status: a.status,
      score: a.score,
      totalMarks: a.total_marks,
      submittedAt: a.submitted_at,
      passed: a.passed,
      feedback: a.feedback,
      scores: a.scores,
      malpracticeCount: a.malpractice_count
    })) as TestAttempt[];
  },

  async addAttempt(attempt: TestAttempt) {
    const { error } = await supabase.from('test_attempts').insert([{
      test_id: attempt.testId,
      student_name: attempt.studentName,
      usn: attempt.usn,
      section: attempt.section,
      branch: attempt.branch,
      answers: attempt.answers,
      status: attempt.status,
      score: attempt.score,
      total_marks: attempt.totalMarks,
      submitted_at: attempt.submittedAt,
      passed: attempt.passed,
      feedback: attempt.feedback,
      scores: attempt.scores,
      malpractice_count: attempt.malpracticeCount
    }]);
    if (error) throw error;
  },

  // Collaboration
  async sendCollaborationRequest(testId: string, senderId: string, receiverId: string) {
    const { error } = await supabase.from('collaboration_requests').insert([{
      test_id: testId,
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending'
    }]);
    if (error) throw error;
  },

  async getCollaborationRequests(receiverId: string) {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .select('*, tests(*)')
      .eq('receiver_id', receiverId)
      .eq('status', 'pending');
    if (error) throw error;
    return data;
  },

  async updateCollaborationRequestStatus(requestId: string, status: 'accepted' | 'rejected') {
    const { data: request, error: fetchError } = await supabase
      .from('collaboration_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('collaboration_requests')
      .update({ status })
      .eq('id', requestId);
    
    if (updateError) throw updateError;

    if (status === 'accepted') {
      // Add to test collaborators
      const { data: test, error: testFetchError } = await supabase
        .from('tests')
        .select('collaborators')
        .eq('id', request.test_id)
        .single();
      
      if (testFetchError) throw testFetchError;

      const currentCollaborators = test.collaborators || [];
      if (!currentCollaborators.includes(request.receiver_id)) {
        const { error: testUpdateError } = await supabase
          .from('tests')
          .update({ collaborators: [...currentCollaborators, request.receiver_id] })
          .eq('id', request.test_id);
        
        if (testUpdateError) throw testUpdateError;
      }
    }
  },

  async updateTestReviewStatus(testId: string, isEnabled: boolean) {
    const { error } = await supabase
      .from('tests')
      .update({ is_review_enabled: isEnabled })
      .eq('id', testId);
    if (error) throw error;
  },

  async updateTestStatus(testId: string, status: TestStatus) {
    const { error } = await supabase
      .from('tests')
      .update({ status })
      .eq('id', testId);
    if (error) throw error;
  },

  async updateTest(test: Test) {
    const { error: testError } = await supabase.from('tests').update({
      title: test.title,
      topic: test.topic,
      subject_code: test.subjectCode,
      subject_name: test.subjectName,
      faculty_name: test.facultyName,
      faculty_id: test.facultyId,
      collaborators: test.collaborators,
      subject: test.subject,
      duration_minutes: test.durationMinutes,
      scheduled_time: test.scheduledTime,
      pass_marks: test.passMarks,
      target_branch: test.targetBranch,
      target_section: test.targetSection,
      is_review_enabled: test.isReviewEnabled,
      status: test.status,
      is_manual_start: test.isManualStart
    }).eq('id', test.id);

    if (testError) throw testError;

    // For questions, we delete and re-insert for simplicity in update
    const { error: deleteError } = await supabase.from('questions').delete().eq('test_id', test.id);
    if (deleteError) throw deleteError;

    const questionsToInsert = test.questions.map(q => ({
      test_id: test.id,
      type: q.type,
      text: q.text,
      options: q.options,
      correct_answer: q.correctAnswer,
      marks: q.marks,
      explanation: q.explanation,
      initial_code: q.initialCode
    }));

    if (questionsToInsert.length > 0) {
      const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
      if (qError) throw qError;
    }
  },

  // Live Sessions
  async deleteTest(testId: string) {
    const { error } = await supabase.from('tests').delete().eq('id', testId);
    if (error) throw error;
  },

  async updateLiveSession(session: Partial<LiveSession>) {
    const { error } = await supabase
      .from('live_sessions')
      .upsert({
        test_id: session.testId,
        student_id: session.studentId,
        student_name: session.studentName,
        current_question_index: session.currentQuestionIndex,
        answered_count: session.answeredCount || 0,
        last_active_at: session.lastActiveAt || new Date().toISOString()
      }, { onConflict: 'test_id, student_id' });
    if (error) throw error;
  },

  async getLiveSessions(testId: string) {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('test_id', testId);
    if (error) throw error;
    return (data || []).map((s: any) => ({
      id: s.id,
      testId: s.test_id,
      studentId: s.student_id,
      studentName: s.student_name,
      currentQuestionIndex: s.current_question_index,
      answeredCount: s.answered_count || 0,
      lastActiveAt: s.last_active_at
    }));
  },

  subscribeToLiveSessions(testId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`live_sessions:test_id=eq.${testId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_sessions',
        filter: `test_id=eq.${testId}`
      }, callback)
      .subscribe();
  },

  async deleteLiveSession(testId: string, studentId: string) {
    const { error } = await supabase
      .from('live_sessions')
      .delete()
      .eq('test_id', testId)
      .eq('student_id', studentId);
    if (error) throw error;
  },

  async clearCollaborators(testId: string) {
    const { error } = await supabase
      .from('tests')
      .update({ collaborators: [] })
      .eq('id', testId);
    if (error) throw error;
  }
};
