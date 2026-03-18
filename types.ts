export type Role = 'teacher' | 'student';
export type Subject = 'Java' | 'Python' | 'SQL' | 'C' | 'Ada';
export type SupportedLanguage = 'java' | 'python' | 'sql' | 'c' | 'ada' | 'dax';

export interface ExecutionResult {
  outputType: 'text' | 'table' | 'error';
  content: string | string[][];
  isError?: boolean;
}

export type QuestionType = 'mcq' | 'coding';

export interface Question {
  id: string;
  type?: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: number;
  marks: number;
  explanation?: string;
  initialCode?: string;
}

export interface Test {
  id: string;
  title: string;
  topic?: string;
  subjectCode?: string;
  subjectName?: string;
  facultyName?: string;
  facultyId?: string;
  collaborators?: string[];
  subject: Subject;
  durationMinutes: number;
  scheduledTime?: string;
  questions: Question[];
  passMarks: number;
  targetBranch?: string;
  targetSection?: string;
}

export type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked_for_review' | 'answered_marked_for_review';

export interface TestAttempt {
  id: string;
  testId: string;
  studentName: string;
  usn?: string;
  section?: string;
  branch?: string;
  answers: Record<string, number | string>;
  status: Record<string, QuestionStatus>;
  score: number;
  totalMarks: number;
  submittedAt: number;
  passed: boolean;
  feedback?: Record<string, string>;
  scores?: Record<string, number>;
  malpracticeCount?: number;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  dept: string;
  password?: string;
}

export interface SubjectReg {
  id: string;
  name: string;
  code: string;
  scheme: string;
  semester: string;
  academicYear: string;
}

export interface StudentReg {
  usn: string;
  name: string;
  branch: string;
  email: string;
  section: string;
  academicYear: string;
  batchName: string;
  password?: string;
}

export interface BranchReg {
  id: string;
  name: string;
}

export interface CollaborationRequest {
  id: string;
  testId: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}
