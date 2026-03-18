import React, { useState, useEffect, useRef } from 'react';
import { Test, TestAttempt, Subject, Question, Faculty, SubjectReg, StudentReg, BranchReg, Role } from '../types';
import { 
  Plus, Users, BarChart3, Settings, Sparkles, X, Code2, UserPlus, 
  BookOpen, GraduationCap, Lock, Unlock, Building2, FileSpreadsheet, 
  Upload, Download, ShieldAlert 
} from 'lucide-react';
import Papa from 'papaparse';
import { generateQuestions, generateCodingQuestions } from '../services/groqService';
import TestReview from './TestReview';
import { supabaseService } from '../services/supabaseService';
import Logo from './Logo';
import AdminPinModal from './AdminPinModal';

interface Props {
  user: { role: Role, name: string, data?: any };
  tests: Test[];
  attempts: TestAttempt[];
  onAddTest: (test: Test) => void;
  onLogout: () => void;
}

export default function TeacherDashboard({ user, tests, attempts, onAddTest, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'manage' | 'analytics' | 'create' | 'faculty-reg' | 'subject-reg' | 'student-reg' | 'branch-reg'>('analytics');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview' | 'test' | 'student' | 'subject' | 'faculty' | 'section'>('overview');
  const [reviewAttempt, setReviewAttempt] = useState<{test: Test, attempt: TestAttempt} | null>(null);

  const [newTest, setNewTest] = useState<Partial<Test>>({
    title: '', subject: 'Java', durationMinutes: 60, passMarks: 40, questions: [],
    topic: '', subjectCode: '', subjectName: '', facultyName: user.name, facultyId: user.data?.id || '', collaborators: [], scheduledTime: '',
    targetBranch: '', targetSection: ''
  });
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQs, setGeneratedQs] = useState<(Question & {selected: boolean})[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Collaboration Requests
  const [collabRequests, setCollabRequests] = useState<any[]>([]);
  const [inviteFacultyId, setInviteFacultyId] = useState('');
  const [selectedTestForInvite, setSelectedTestForInvite] = useState<string | null>(null);

  // Registration States
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<SubjectReg[]>([]);
  const [students, setStudents] = useState<StudentReg[]>([]);
  const [branches, setBranches] = useState<BranchReg[]>([]);

  // Admin PIN States
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [f, s, st, b] = await Promise.all([
          supabaseService.getFaculties(),
          supabaseService.getSubjects(),
          supabaseService.getStudents(),
          supabaseService.getBranches()
        ]);
        setFaculties(f);
        setSubjects(s);
        setStudents(st);
        setBranches(b);

        if (user.data?.id) {
          const requests = await supabaseService.getCollaborationRequests(user.data.id);
          setCollabRequests(requests);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [user.data?.id]);

  const [newFaculty, setNewFaculty] = useState<Partial<Faculty>>({ id: '', name: '', email: '', dept: '', password: 'Atria@2026' });
  const [newSubject, setNewSubject] = useState<Partial<SubjectReg>>({ name: '', code: '', scheme: '2022', semester: '', academicYear: '' });
  const [newStudent, setNewStudent] = useState<Partial<StudentReg>>({ usn: '', name: '', branch: '', email: '', section: '', academicYear: '2026-2027', batchName: '', password: 'Atria@2026' });
  const [newBranchName, setNewBranchName] = useState('');

  const handleInviteCollaborator = async (testId: string) => {
    if (!inviteFacultyId) return;
    try {
      await supabaseService.sendCollaborationRequest(testId, user.data.id, inviteFacultyId);
      alert('Collaboration request sent!');
      setInviteFacultyId('');
      setSelectedTestForInvite(null);
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invite.');
    }
  };

  const handleAcceptInvite = async (requestId: string) => {
    try {
      await supabaseService.updateCollaborationRequestStatus(requestId, 'accepted');
      alert('Collaboration request accepted!');
      // Refresh data
      const requests = await supabaseService.getCollaborationRequests(user.data.id);
      setCollabRequests(requests);
      // Refresh tests (App.tsx handles this via supabaseService.getTests() in useEffect, 
      // but we might need a way to trigger it or just wait for next refresh)
      window.location.reload(); // Simple way to refresh everything
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invite.');
    }
  };

  const handleRejectInvite = async (requestId: string) => {
    try {
      await supabaseService.updateCollaborationRequestStatus(requestId, 'rejected');
      const requests = await supabaseService.getCollaborationRequests(user.data.id);
      setCollabRequests(requests);
    } catch (error) {
      console.error('Error rejecting invite:', error);
      alert('Failed to reject invite.');
    }
  };

  const handleGenerateAI = async (type: 'mcq' | 'coding') => {
    if (!aiTopic || !newTest.subject) return;
    setIsGenerating(true);
    setErrorMessage('');
    try {
      let qs;
      if (type === 'coding') {
        qs = await generateCodingQuestions(newTest.subject, aiTopic, 1);
      } else {
        qs = await generateQuestions(newTest.subject, aiTopic, 3);
      }
      setGeneratedQs(qs.map((q: any) => ({ ...q, id: Date.now().toString() + Math.random(), marks: 10, selected: true })));
    } catch (e) {
      setErrorMessage("Failed to generate questions. Check API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSelectedAI = () => {
    const selected = generatedQs.filter(q => q.selected);
    setNewTest(prev => ({ ...prev, questions: [...(prev.questions || []), ...selected] }));
    setGeneratedQs([]);
    setAiTopic('');
  };

  const handleSaveTest = () => {
    if (!newTest.title || !newTest.questions?.length) {
      setErrorMessage("Please provide a title and at least one question.");
      return;
    }
    
    let finalScheduledTime = newTest.scheduledTime;
    if (finalScheduledTime) {
      // Convert local datetime string to ISO string with timezone
      const localDate = new Date(finalScheduledTime);
      if (!isNaN(localDate.getTime())) {
        finalScheduledTime = localDate.toISOString();
      }
    }

    onAddTest({ 
      ...newTest, 
      id: Date.now().toString(), 
      scheduledTime: finalScheduledTime || null,
      durationMinutes: Number(newTest.durationMinutes) || 60,
      passMarks: Number(newTest.passMarks) || 40,
      questions: newTest.questions?.map(q => ({
        ...q,
        marks: Number(q.marks) || 10
      }))
    } as Test);
    setActiveTab('manage');
    setNewTest({ title: '', subject: 'Java', durationMinutes: 60, passMarks: 40, questions: [], topic: '', subjectCode: '', subjectName: '', facultyName: user.name, facultyId: user.data?.id || '', collaborators: [], scheduledTime: '', targetBranch: '', targetSection: '' });
    setErrorMessage('');
  };

  const handleAddFaculty = async () => {
    if (newFaculty.id && newFaculty.name && newFaculty.email && newFaculty.dept) {
      try {
        await supabaseService.addFaculty(newFaculty as Faculty);
        const f = await supabaseService.getFaculties();
        setFaculties(f);
        setNewFaculty({ id: '', name: '', email: '', dept: '', password: 'Atria@2026' });
      } catch (error) {
        console.error('Error adding faculty:', error);
        alert('Failed to add faculty.');
      }
    } else {
      alert('Please fill all fields');
    }
  };

  const handleAddSubject = async () => {
    if (newSubject.name && newSubject.code && newSubject.scheme && newSubject.semester && newSubject.academicYear) {
      try {
        await supabaseService.addSubject(newSubject as SubjectReg);
        const s = await supabaseService.getSubjects();
        setSubjects(s);
        setNewSubject({ name: '', code: '', scheme: '2022', semester: '', academicYear: '' });
      } catch (error) {
        console.error('Error adding subject:', error);
        alert('Failed to add subject.');
      }
    } else {
      alert('Please fill all fields');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'faculty' | 'student') => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (type === 'faculty') {
            const facultiesToImport = results.data.map((row: any) => ({
              id: row.id || row.ID,
              name: row.name || row.Name,
              email: row.email || row.Email,
              dept: row.dept || row.Dept || row.Department,
              password: row.password || 'atria123',
              collaborators: []
            })) as Faculty[];
            await supabaseService.addFacultiesBulk(facultiesToImport);
            const f = await supabaseService.getFaculties();
            setFaculties(f);
          } else {
            const studentsToImport = results.data.map((row: any) => ({
              usn: row.usn || row.USN,
              name: row.name || row.Name,
              branch: row.branch || row.Branch || row.Dept,
              email: row.email || row.Email,
              section: row.section || row.Section || 'A',
              academicYear: row.academicYear || row.AcademicYear || '2026-2027',
              batchName: row.batchName || row.BatchName || '2026',
              password: row.password || 'atria123'
            })) as StudentReg[];
            await supabaseService.addStudentsBulk(studentsToImport);
            const st = await supabaseService.getStudents();
            setStudents(st);
          }
          alert(`Successfully imported ${results.data.length} ${type}s`);
        } catch (error) {
          console.error(`Error importing ${type}s:`, error);
          alert(`Failed to import ${type}s. Check file format.`);
        }
      }
    });
  };

  const downloadTemplate = (type: 'faculty' | 'student') => {
    const headers = type === 'faculty' 
      ? ['id', 'name', 'email', 'dept', 'password']
      : ['usn', 'name', 'branch', 'email', 'section', 'academicYear', 'batchName', 'password'];
    
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${type}_template.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAddStudent = async () => {
    if (newStudent.usn && newStudent.name && newStudent.branch && newStudent.email && newStudent.section && newStudent.academicYear && newStudent.batchName) {
      try {
        await supabaseService.addStudent(newStudent as StudentReg);
        const st = await supabaseService.getStudents();
        setStudents(st);
        setNewStudent({ usn: '', name: '', branch: '', email: '', section: '', academicYear: '2026-2027', batchName: '', password: 'Atria@2026' });
      } catch (error) {
        console.error('Error adding student:', error);
        alert('Failed to add student.');
      }
    } else {
      alert('Please fill all fields');
    }
  };

  if (reviewAttempt) {
    return <TestReview test={reviewAttempt.test} attempt={reviewAttempt.attempt} onBack={() => setReviewAttempt(null)} onlyWrong={true} />;
  }

  return (
    <div className="min-h-screen bg-paper flex font-sans">
      <div className="w-64 bg-paper border-r border-black/10 flex flex-col">
        <div className="p-6 border-b border-black/10">
          <div className="flex items-center text-ink select-none">
            <Logo onAdminTrigger={() => setShowPinDialog(true)} />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-semibold">Atria Institute of Technology</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
            <BarChart3 size={18} /> Analytics & Leaderboard
          </button>
          <button onClick={() => setActiveTab('manage')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'manage' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
            <Users size={18} /> Manage Tests
          </button>
          <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'create' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
            <Plus size={18} /> Create New Test
          </button>
          
          {!isAdmin && (
            <div className="pt-4 mt-4 border-t border-black/5">
              <button onClick={() => setShowPinDialog(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-black/5">
                <Lock size={18} /> Admin Access
              </button>
            </div>
          )}

          {isAdmin && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Registrations</p>
              </div>
              <button onClick={() => setActiveTab('branch-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'branch-reg' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
                <Building2 size={18} /> Branch / Dept
              </button>
              <button onClick={() => setActiveTab('faculty-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'faculty-reg' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
                <UserPlus size={18} /> Faculty
              </button>
              <button onClick={() => setActiveTab('subject-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'subject-reg' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
                <BookOpen size={18} /> Subject
              </button>
              <button onClick={() => setActiveTab('student-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'student-reg' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}>
                <GraduationCap size={18} /> Student
              </button>
              <div className="pt-4 mt-4 border-t border-black/5">
                <button onClick={() => setShowChangePin(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-black/5">
                  <Settings size={18} /> Change Admin PIN
                </button>
                <button onClick={() => {
                  setIsAdmin(false);
                  if (['faculty-reg', 'subject-reg', 'student-reg', 'branch-reg'].includes(activeTab)) {
                    setActiveTab('analytics');
                  }
                }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-black/5">
                  <Lock size={18} /> Lock Admin
                </button>
              </div>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-black/10">
          <button onClick={onLogout} className="w-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-ink hover:bg-black/5 rounded-lg transition-colors text-left">Sign Out</button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto bg-paper">
        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-serif text-ink mb-6">Analytics Dashboard</h1>
            
            <div className="flex gap-2 mb-6 border-b border-black/10 pb-2 overflow-x-auto">
              {['overview', 'test', 'student', 'subject', 'faculty', 'section'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setAnalyticsSubTab(tab as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors whitespace-nowrap ${analyticsSubTab === tab ? 'bg-ink text-white' : 'text-slate-600 hover:bg-black/5'}`}
                >
                  {tab === 'overview' ? 'Leaderboard' : `${tab} Wise`}
                </button>
              ))}
            </div>

            {analyticsSubTab === 'overview' && (
              <>
                {collabRequests.length > 0 && (
                  <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h3 className="text-amber-800 font-serif font-semibold mb-4 flex items-center gap-2">
                      <Users size={20} /> Collaboration Requests
                    </h3>
                    <div className="space-y-3">
                      {collabRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-amber-100 shadow-sm">
                          <div>
                            <p className="text-sm font-medium text-ink">
                              <span className="font-bold">{faculties.find(f => f.id === req.sender_id)?.name || req.sender_id}</span> invited you to collaborate on:
                            </p>
                            <p className="text-lg font-serif text-amber-900">{req.tests?.title}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAcceptInvite(req.id)}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleRejectInvite(req.id)}
                              className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Total Attempts</h3>
                    <p className="text-4xl font-serif text-ink">{attempts.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Pass Rate</h3>
                    <p className="text-4xl font-serif text-emerald-700">
                      {attempts.length ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0}%
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Failing Students</h3>
                    <p className="text-4xl font-serif text-red-700">{attempts.filter(a => !a.passed).length}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                  <div className="p-6 border-b border-black/5 bg-paper/30">
                    <h3 className="text-lg font-serif font-semibold text-ink">Overall Leaderboard</h3>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-paper/50 text-slate-500 text-xs uppercase tracking-wider border-b border-black/5">
                        <th className="p-4 font-semibold">Rank</th>
                        <th className="p-4 font-semibold">Student</th>
                        <th className="p-4 font-semibold">Test</th>
                        <th className="p-4 font-semibold">Score</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.sort((a,b) => b.score - a.score).map((attempt, idx) => {
                        const test = tests.find(t => t.id === attempt.testId);
                        if (!test) return null;
                        return (
                          <tr key={attempt.id} className="border-b border-black/5 hover:bg-paper/30 transition-colors">
                            <td className="p-4 font-serif text-lg text-slate-400">#{idx + 1}</td>
                            <td className="p-4 font-medium text-ink">{attempt.studentName}</td>
                            <td className="p-4 text-slate-600 text-sm">{test.title}</td>
                            <td className="p-4 font-mono text-sm">{attempt.score} / {attempt.totalMarks}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${attempt.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {attempt.passed ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                            <td className="p-4">
                              <button 
                                onClick={() => setReviewAttempt({test, attempt})}
                                className="text-ink hover:text-slate-600 text-sm font-medium underline decoration-black/20 underline-offset-4"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {attempts.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">No attempts yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {analyticsSubTab === 'test' && (
              <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 border-b border-black/5 bg-paper/30">
                  <h3 className="text-lg font-serif font-semibold text-ink">Test Wise Analysis</h3>
                </div>
                <div className="p-6">
                  {tests.map(test => {
                    const testAttempts = attempts.filter(a => a.testId === test.id);
                    const passRate = testAttempts.length ? Math.round((testAttempts.filter(a => a.passed).length / testAttempts.length) * 100) : 0;
                    return (
                      <div key={test.id} className="mb-6 border border-black/10 rounded-lg p-6 bg-paper/20">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-serif text-xl font-semibold text-ink mb-1">{test.title}</h4>
                            <p className="text-sm text-slate-500 font-mono">ID: {test.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-1">Total Attempts: {testAttempts.length}</p>
                            <p className="text-lg font-mono text-ink">Pass Rate: {passRate}%</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-white p-3 rounded border border-black/5">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Topic</p>
                            <p className="text-sm font-medium text-ink">{test.topic || '-'}</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-black/5">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subject</p>
                            <p className="text-sm font-medium text-ink">{test.subjectName || test.subject} {test.subjectCode ? `(${test.subjectCode})` : ''}</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-black/5">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Faculty</p>
                            <p className="text-sm font-medium text-ink">{test.facultyName || '-'} {test.facultyId ? `(${test.facultyId})` : ''}</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-black/5">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Questions</p>
                            <p className="text-sm font-medium text-ink">{test.questions.length}</p>
                          </div>
                        </div>

                        {testAttempts.length > 0 ? (
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-black/5">
                                <th className="p-3 font-semibold">Student</th>
                                <th className="p-3 font-semibold">Score</th>
                                <th className="p-3 font-semibold">Status</th>
                                <th className="p-3 font-semibold text-red-600">Malpractice</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {testAttempts.map(att => (
                                <tr key={att.id} className="border-b border-black/5">
                                  <td className="p-3 text-slate-700">{att.studentName}</td>
                                  <td className="p-3 font-mono text-slate-600">{att.score} / {att.totalMarks}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${att.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                      {att.passed ? 'Passed' : 'Failed'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {att.malpracticeCount && att.malpracticeCount > 0 ? (
                                      <span className="flex items-center gap-1 text-red-600 font-bold animate-pulse">
                                        <ShieldAlert size={14} /> {att.malpracticeCount}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 text-xs">None</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No attempts for this test yet.</p>
                        )}
                      </div>
                    );
                  })}
                  {tests.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No tests available.</p>}
                </div>
              </div>
            )}

            {analyticsSubTab === 'student' && (
              <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 border-b border-black/5 bg-paper/30">
                  <h3 className="text-lg font-serif font-semibold text-ink">Student Wise Analysis</h3>
                </div>
                <div className="p-6">
                  {Object.entries(attempts.reduce((acc, att) => {
                    if (!acc[att.studentName]) acc[att.studentName] = [];
                    acc[att.studentName].push(att);
                    return acc;
                  }, {} as Record<string, TestAttempt[]>)).map(([student, studentAttempts]) => (
                    <div key={student} className="mb-6 border border-black/10 rounded-lg p-6 bg-paper/20">
                      <h4 className="font-serif text-xl font-semibold text-ink mb-2">{student}</h4>
                      <p className="text-sm text-slate-500 mb-4 uppercase tracking-wider font-medium">Total Attempts: {studentAttempts.length} | Average Score: {Math.round(studentAttempts.reduce((sum, a) => sum + (a.score/a.totalMarks)*100, 0) / studentAttempts.length)}%</p>
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-black/5">
                            <th className="p-3 font-semibold">Test</th>
                            <th className="p-3 font-semibold">Score</th>
                            <th className="p-3 font-semibold">Status</th>
                            <th className="p-3 font-semibold text-red-600">Malpractice</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {studentAttempts.map(att => {
                            const test = tests.find(t => t.id === att.testId);
                            return (
                              <tr key={att.id} className="border-b border-black/5">
                                <td className="p-3 text-slate-700">{test?.title || 'Unknown Test'}</td>
                                <td className="p-3 font-mono text-slate-600">{att.score} / {att.totalMarks}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${att.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {att.passed ? 'Passed' : 'Failed'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {att.malpracticeCount && att.malpracticeCount > 0 ? (
                                    <span className="flex items-center gap-1 text-red-600 font-bold">
                                      <ShieldAlert size={14} /> {att.malpracticeCount}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 text-xs">None</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {attempts.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No data available.</p>}
                </div>
              </div>
            )}

            {analyticsSubTab === 'subject' && (
              <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 border-b border-black/5 bg-paper/30">
                  <h3 className="text-lg font-serif font-semibold text-ink">Subject Wise Analysis</h3>
                </div>
                <div className="p-6">
                  {Object.entries(attempts.reduce((acc, att) => {
                    const test = tests.find(t => t.id === att.testId);
                    const subject = test?.subjectName || test?.subject || 'Unknown Subject';
                    if (!acc[subject]) acc[subject] = [];
                    acc[subject].push(att);
                    return acc;
                  }, {} as Record<string, TestAttempt[]>)).map(([subject, subjectAttempts]) => (
                    <div key={subject} className="mb-4 border border-black/10 rounded-lg p-6 bg-paper/20 flex justify-between items-center">
                      <h4 className="font-serif text-xl font-semibold text-ink">{subject}</h4>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-1">Total Attempts: {subjectAttempts.length}</p>
                        <p className="text-lg font-mono text-ink">Pass Rate: {Math.round((subjectAttempts.filter(a => a.passed).length / subjectAttempts.length) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                  {attempts.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No data available.</p>}
                </div>
              </div>
            )}

            {analyticsSubTab === 'faculty' && (
              <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 border-b border-black/5 bg-paper/30">
                  <h3 className="text-lg font-serif font-semibold text-ink">Faculty Wise Analysis</h3>
                </div>
                <div className="p-6">
                  {Object.entries(attempts.reduce((acc, att) => {
                    const test = tests.find(t => t.id === att.testId);
                    const faculty = test?.facultyName || 'Unknown Faculty';
                    if (!acc[faculty]) acc[faculty] = [];
                    acc[faculty].push(att);
                    return acc;
                  }, {} as Record<string, TestAttempt[]>)).map(([faculty, facultyAttempts]) => (
                    <div key={faculty} className="mb-4 border border-black/10 rounded-lg p-6 bg-paper/20 flex justify-between items-center">
                      <h4 className="font-serif text-xl font-semibold text-ink">{faculty}</h4>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-1">Student Attempts: {facultyAttempts.length}</p>
                        <p className="text-lg font-mono text-ink">Avg Pass Rate: {Math.round((facultyAttempts.filter(a => a.passed).length / facultyAttempts.length) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                  {attempts.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No data available.</p>}
                </div>
              </div>
            )}

            {analyticsSubTab === 'section' && (
              <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-6 border-b border-black/5 bg-paper/30">
                  <h3 className="text-lg font-serif font-semibold text-ink">Section Wise Analysis</h3>
                </div>
                <div className="p-6">
                  {Object.entries(attempts.reduce((acc, att) => {
                    const studentReg = students.find(s => s.name === att.studentName || s.usn === att.usn);
                    const section = att.section || studentReg?.section || 'Unknown Section';
                    if (!acc[section]) acc[section] = [];
                    acc[section].push(att);
                    return acc;
                  }, {} as Record<string, TestAttempt[]>)).map(([section, sectionAttempts]) => (
                    <div key={section} className="mb-4 border border-black/10 rounded-lg p-6 bg-paper/20 flex justify-between items-center">
                      <h4 className="font-serif text-xl font-semibold text-ink">Section: {section}</h4>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-1">Total Attempts: {sectionAttempts.length}</p>
                        <p className="text-lg font-mono text-ink">Pass Rate: {Math.round((sectionAttempts.filter(a => a.passed).length / sectionAttempts.length) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                  {attempts.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No data available.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-serif text-ink">Manage Tests</h1>
              <button onClick={() => setActiveTab('create')} className="bg-ink text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2">
                <Plus size={18} /> Create Test
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map(test => (
                <div key={test.id} className="bg-white p-6 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-serif text-xl font-semibold text-ink">{test.title}</h3>
                    <span className="bg-paper text-slate-600 text-xs px-2 py-1 rounded-md font-medium border border-black/5">{test.subject}</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 mb-6">
                    <p><span className="font-medium text-slate-800">Test ID:</span> <span className="font-mono text-xs">{test.id}</span></p>
                    {test.topic && <p><span className="font-medium text-slate-800">Topic:</span> {test.topic}</p>}
                    {test.subjectCode && <p><span className="font-medium text-slate-800">Subject:</span> {test.subjectName} ({test.subjectCode})</p>}
                    {test.facultyName && <p><span className="font-medium text-slate-800">Faculty:</span> {test.facultyName} {test.facultyId ? `(${test.facultyId})` : ''}</p>}
                    {test.scheduledTime && <p><span className="font-medium text-slate-800">Scheduled:</span> {new Date(test.scheduledTime).toLocaleString()}</p>}
                    <p><span className="font-medium text-slate-800">Duration:</span> {test.durationMinutes} mins</p>
                    <p><span className="font-medium text-slate-800">Questions:</span> {test.questions.length}</p>
                    <p><span className="font-medium text-slate-800">Pass Marks:</span> {test.passMarks}</p>
                    {test.collaborators && test.collaborators.length > 0 && (
                      <p><span className="font-medium text-slate-800">Collaborators:</span> {test.collaborators.length}</p>
                    )}
                  </div>
                  
                  {test.facultyId === user.data?.id && (
                    <div className="pt-4 border-t border-black/5">
                      {selectedTestForInvite === test.id ? (
                        <div className="space-y-3">
                          <select 
                            value={inviteFacultyId}
                            onChange={e => setInviteFacultyId(e.target.value)}
                            className="w-full p-2 border border-black/10 rounded-md text-sm"
                          >
                            <option value="">Select Faculty to Invite</option>
                            {faculties.filter(f => f.id !== user.data?.id && !test.collaborators?.includes(f.id)).map(f => (
                              <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleInviteCollaborator(test.id)}
                              className="flex-1 bg-ink text-white py-2 rounded-md text-xs font-medium hover:bg-slate-800"
                            >
                              Send Invite
                            </button>
                            <button 
                              onClick={() => setSelectedTestForInvite(null)}
                              className="flex-1 bg-paper text-slate-600 py-2 rounded-md text-xs font-medium border border-black/10"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setSelectedTestForInvite(test.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-ink hover:bg-black/5 rounded-lg transition-colors border border-black/10"
                        >
                          <UserPlus size={16} /> Invite Collaborator
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {tests.length === 0 && (
                <div className="col-span-full text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                  No tests created yet. Click "Create Test" to begin.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif text-ink mb-6">Create New Test</h1>
            
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="bg-white p-8 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-6">
              <h2 className="text-xl font-serif font-semibold text-ink mb-6">Test Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Title</label>
                  <input type="text" value={newTest.title} onChange={e => setNewTest({...newTest, title: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., Midterm Exam" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Language / Category</label>
                  <select value={newTest.subject} onChange={e => setNewTest({...newTest, subject: e.target.value as Subject})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none">
                    <option value="Java">Java</option>
                    <option value="Python">Python</option>
                    <option value="SQL">SQL</option>
                    <option value="C">C</option>
                    <option value="Ada">Ada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Topic</label>
                  <input type="text" value={newTest.topic || ''} onChange={e => setNewTest({...newTest, topic: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., Arrays" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Subject Code</label>
                  <input type="text" value={newTest.subjectCode || ''} onChange={e => setNewTest({...newTest, subjectCode: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., CS101" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Subject Name</label>
                  <input type="text" value={newTest.subjectName || ''} onChange={e => setNewTest({...newTest, subjectName: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., Intro to CS" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Faculty ID</label>
                  <input type="text" value={newTest.facultyId || ''} onChange={e => setNewTest({...newTest, facultyId: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., FAC001" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Faculty Name</label>
                  <input type="text" value={newTest.facultyName || ''} onChange={e => setNewTest({...newTest, facultyName: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., John Doe" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Duration (minutes)</label>
                  <input type="number" value={isNaN(newTest.durationMinutes!) ? '' : newTest.durationMinutes} onChange={e => setNewTest({...newTest, durationMinutes: parseInt(e.target.value)})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Scheduled Time</label>
                  <input type="datetime-local" value={newTest.scheduledTime || ''} onChange={e => setNewTest({...newTest, scheduledTime: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Pass Marks</label>
                  <input type="number" value={isNaN(newTest.passMarks!) ? '' : newTest.passMarks} onChange={e => setNewTest({...newTest, passMarks: parseInt(e.target.value)})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Target Branch (Optional)</label>
                  <select value={newTest.targetBranch || ''} onChange={e => setNewTest({...newTest, targetBranch: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none">
                    <option value="">All Branches</option>
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Target Section (Optional)</label>
                  <input type="text" value={newTest.targetSection || ''} onChange={e => setNewTest({...newTest, targetSection: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., A" />
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif font-semibold text-ink">Questions ({newTest.questions?.length || 0})</h2>
              </div>
              
              <div className="bg-paper/30 p-6 rounded-lg border border-black/5 mb-8">
                <h3 className="font-serif font-medium text-ink flex items-center gap-2 mb-4"><Sparkles size={18} className="text-olive" /> Generate with AI</h3>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={aiTopic} 
                    onChange={e => setAiTopic(e.target.value)} 
                    placeholder={`Enter topic for ${newTest.subject} (e.g., "Inheritance and Polymorphism")`}
                    className="flex-1 p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-white transition-colors rounded-none"
                  />
                  <button 
                    onClick={() => handleGenerateAI('mcq')} 
                    disabled={isGenerating || !aiTopic}
                    className="bg-ink text-white px-6 py-3 rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    title="Generate 3 MCQs"
                  >
                    {isGenerating ? 'Generating...' : 'MCQs'}
                  </button>
                  <button 
                    onClick={() => handleGenerateAI('coding')} 
                    disabled={isGenerating || !aiTopic}
                    className="bg-olive text-white px-6 py-3 rounded-md hover:bg-[#4a4a35] disabled:opacity-50 flex items-center gap-2 transition-colors"
                    title="Generate 1 Coding Question"
                  >
                    <Code2 size={18} />
                    {isGenerating ? 'Generating...' : 'Coding'}
                  </button>
                </div>

                {generatedQs.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-medium text-slate-700 mb-3">Select Questions to Add:</h4>
                    {generatedQs.map((q, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-lg border border-black/5 flex gap-4 shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={q.selected} 
                          onChange={e => {
                            const newQs = [...generatedQs];
                            newQs[idx].selected = e.target.checked;
                            setGeneratedQs(newQs);
                          }}
                          className="mt-1 w-4 h-4 text-ink accent-ink"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <p className="font-medium text-ink">{q.text}</p>
                            <span className="text-xs font-medium bg-paper text-slate-600 px-2 py-1 rounded-md uppercase border border-black/5">{q.type || 'mcq'}</span>
                          </div>
                          {q.type === 'coding' ? (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Initial Code:</p>
                              <pre className="text-xs bg-slate-50 p-3 rounded-md border border-slate-200 font-mono overflow-x-auto text-slate-700">{q.initialCode}</pre>
                            </div>
                          ) : (
                            <ul className="text-sm text-slate-600 space-y-2 mb-3">
                              {q.options?.map((opt, i) => (
                                <li key={i} className={i === q.correctAnswer ? 'text-olive font-medium flex items-center gap-2' : 'flex items-center gap-2'}>
                                  <span className="w-6 h-6 rounded-full bg-paper flex items-center justify-center text-xs border border-black/5">{String.fromCharCode(65+i)}</span> {opt}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-xs text-slate-500 bg-paper/50 p-3 rounded-md border border-black/5"><span className="font-semibold text-slate-700">Explanation:</span> {q.explanation}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={handleAddSelectedAI} className="w-full bg-paper text-ink border border-black/10 py-3 rounded-md font-medium hover:bg-slate-100 transition-colors mt-4">
                      Add Selected Questions
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif font-medium text-ink text-lg">Or Add Manually</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setNewTest(prev => ({ ...prev, questions: [...(prev.questions || []), { id: Date.now().toString(), type: 'mcq', text: 'New MCQ Question', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 0, marks: 10 }] }))}
                    className="bg-white border border-black/10 text-ink px-4 py-2 rounded-md text-sm hover:bg-paper transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus size={16} /> Add MCQ
                  </button>
                  <button 
                    onClick={() => setNewTest(prev => ({ ...prev, questions: [...(prev.questions || []), { id: Date.now().toString(), type: 'coding', text: 'Write a program to...', initialCode: '// Type your code here\n', marks: 10 }] }))}
                    className="bg-white border border-black/10 text-ink px-4 py-2 rounded-md text-sm hover:bg-paper transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus size={16} /> Add Coding Question
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {newTest.questions?.map((q, idx) => (
                  <div key={idx} className="p-6 border border-black/10 rounded-xl bg-white shadow-sm">
                    <div className="flex justify-between mb-4">
                      <span className="font-serif font-semibold text-ink text-lg">Q{idx + 1}. <span className="text-xs font-medium bg-paper border border-black/5 px-2 py-1 rounded-md ml-2 uppercase tracking-wider">{q.type || 'mcq'}</span></span>
                      <button 
                        onClick={() => {
                          const newQs = [...(newTest.questions || [])];
                          newQs.splice(idx, 1);
                          setNewTest(prev => ({ ...prev, questions: newQs }));
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Marks</label>
                      <input 
                        type="number" 
                        value={isNaN(q.marks) ? '' : q.marks}
                        onChange={e => {
                          const newQs = [...(newTest.questions || [])];
                          newQs[idx].marks = parseInt(e.target.value);
                          setNewTest(prev => ({ ...prev, questions: newQs }));
                        }}
                        className="w-24 p-2 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none text-sm"
                      />
                    </div>
                    
                    <textarea 
                      value={q.text}
                      onChange={e => {
                        const newQs = [...(newTest.questions || [])];
                        newQs[idx].text = e.target.value;
                        setNewTest(prev => ({ ...prev, questions: newQs }));
                      }}
                      className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none mb-4 resize-y"
                      rows={2}
                    />

                    {q.type === 'coding' ? (
                      <div>
                        <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Initial Code Template</label>
                        <textarea 
                          value={q.initialCode || ''}
                          onChange={e => {
                            const newQs = [...(newTest.questions || [])];
                            newQs[idx].initialCode = e.target.value;
                            setNewTest(prev => ({ ...prev, questions: newQs }));
                          }}
                          className="w-full p-4 border border-slate-300 rounded-lg font-mono text-sm bg-slate-50 focus:border-ink focus:outline-none transition-colors"
                          rows={4}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {q.options?.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name={`correct-${q.id}`} 
                              checked={q.correctAnswer === oIdx}
                              onChange={() => {
                                const newQs = [...(newTest.questions || [])];
                                newQs[idx].correctAnswer = oIdx;
                                setNewTest(prev => ({ ...prev, questions: newQs }));
                              }}
                              className="text-ink accent-ink w-4 h-4"
                            />
                            <input 
                              type="text" 
                              value={opt}
                              onChange={e => {
                                const newQs = [...(newTest.questions || [])];
                                newQs[idx].options![oIdx] = e.target.value;
                                setNewTest(prev => ({ ...prev, questions: newQs }));
                              }}
                              className="flex-1 p-2 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!newTest.questions || newTest.questions.length === 0) && (
                  <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                    No questions added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveTest} className="bg-ink text-white px-8 py-3 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm">
                Save Test
              </button>
            </div>
          </div>
        )}

        {activeTab === 'branch-reg' && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif text-ink mb-6">Branch / Department Registration</h1>
            <div className="bg-white p-8 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-8">
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Branch / Department Name</label>
                <input type="text" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g., Computer Science" />
              </div>
              <button 
                onClick={async () => {
                  if (!newBranchName) return;
                  try {
                    await supabaseService.addBranch(newBranchName);
                    const b = await supabaseService.getBranches();
                    setBranches(b);
                    setNewBranchName('');
                    alert('Branch registered successfully!');
                  } catch (e) {
                    alert('Failed to register branch. It might already exist.');
                  }
                }}
                className="bg-ink text-white px-8 py-3 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                Register Branch
              </button>
            </div>

            <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-6 border-b border-black/5 bg-paper/50">
                <h2 className="text-xl font-serif font-semibold text-ink">Registered Branches</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-paper/30 border-b border-black/5">
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {branches.map(b => (
                    <tr key={b.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="p-4 font-medium text-ink">{b.name}</td>
                    </tr>
                  ))}
                  {branches.length === 0 && (
                    <tr>
                      <td className="p-8 text-center text-slate-500 italic">No branches registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'faculty-reg' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-serif text-ink">Faculty Registration</h1>
              <div className="flex gap-2">
                <button 
                  onClick={() => downloadTemplate('faculty')}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-ink border border-black/10 rounded-md transition-colors"
                >
                  <Download size={14} /> Template
                </button>
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-ink text-white rounded-md cursor-pointer hover:bg-slate-800 transition-colors">
                  <Upload size={14} /> Bulk Import
                  <input type="file" accept=".csv" className="hidden" onChange={e => handleFileUpload(e, 'faculty')} />
                </label>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Faculty ID</label>
                  <input type="text" value={newFaculty.id} onChange={e => setNewFaculty({...newFaculty, id: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Faculty Name</label>
                  <input type="text" value={newFaculty.name} onChange={e => setNewFaculty({...newFaculty, name: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Email</label>
                  <input type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Department</label>
                  <select value={newFaculty.dept} onChange={e => setNewFaculty({...newFaculty, dept: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none">
                    <option value="">-- Select Department --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Password</label>
                  <input type="text" value={newFaculty.password} onChange={e => setNewFaculty({...newFaculty, password: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="Default: Atria@2026" />
                </div>
              </div>
              <button 
                onClick={handleAddFaculty}
                className="bg-ink text-white px-8 py-3 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                Register Faculty
              </button>
            </div>

            <h2 className="text-xl font-serif font-semibold text-ink mb-4">Registered Faculties</h2>
            <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-paper/50 text-slate-500 text-xs uppercase tracking-wider border-b border-black/5">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Department</th>
                    <th className="p-4 font-semibold">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((f, i) => (
                    <tr key={i} className="border-b border-black/5 hover:bg-paper/30 transition-colors">
                      <td className="p-4 font-mono text-sm text-ink">{f.id}</td>
                      <td className="p-4 text-sm text-slate-700 font-medium">{f.name}</td>
                      <td className="p-4 text-sm text-slate-600">{f.email}</td>
                      <td className="p-4 text-sm text-slate-600">{f.dept}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <input 
                          type="text" 
                          defaultValue={f.password} 
                          onBlur={async (e) => {
                            if (e.target.value !== f.password) {
                              try {
                                await supabaseService.updatePassword('teacher', f.id, e.target.value);
                                alert('Password updated');
                              } catch (err) {
                                alert('Failed to update password');
                              }
                            }
                          }}
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                        />
                      </td>
                    </tr>
                  ))}
                  {faculties.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-sm">No faculties registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subject-reg' && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif text-ink mb-6">Subject Registration</h1>
            <div className="bg-white p-8 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Subject Name</label>
                  <input type="text" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Subject Code</label>
                  <input type="text" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Scheme</label>
                  <select value={newSubject.scheme} onChange={e => setNewSubject({...newSubject, scheme: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none">
                    <option value="2022">2022</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Semester</label>
                  <input type="text" value={newSubject.semester} onChange={e => setNewSubject({...newSubject, semester: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Academic Year</label>
                  <input type="text" value={newSubject.academicYear} onChange={e => setNewSubject({...newSubject, academicYear: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="e.g. 2026-2027" />
                </div>
              </div>
              <button 
                onClick={handleAddSubject}
                className="bg-ink text-white px-8 py-3 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                Register Subject
              </button>
            </div>

            <h2 className="text-xl font-serif font-semibold text-ink mb-4">Registered Subjects</h2>
            <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-paper/50 text-slate-500 text-xs uppercase tracking-wider border-b border-black/5">
                    <th className="p-4 font-semibold">Code</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Scheme</th>
                    <th className="p-4 font-semibold">Semester</th>
                    <th className="p-4 font-semibold">Academic Year</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => (
                    <tr key={i} className="border-b border-black/5 hover:bg-paper/30 transition-colors">
                      <td className="p-4 font-mono text-sm text-ink">{s.code}</td>
                      <td className="p-4 text-sm text-slate-700 font-medium">{s.name}</td>
                      <td className="p-4 text-sm text-slate-600">{s.scheme}</td>
                      <td className="p-4 text-sm text-slate-600">{s.semester}</td>
                      <td className="p-4 text-sm text-slate-600">{s.academicYear}</td>
                    </tr>
                  ))}
                  {subjects.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-sm">No subjects registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'student-reg' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-serif text-ink">Student Registration</h1>
              <div className="flex gap-2">
                <button 
                  onClick={() => downloadTemplate('student')}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-ink border border-black/10 rounded-md transition-colors"
                >
                  <Download size={14} /> Template
                </button>
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-ink text-white rounded-md cursor-pointer hover:bg-slate-800 transition-colors">
                  <Upload size={14} /> Bulk Import
                  <input type="file" accept=".csv" className="hidden" onChange={e => handleFileUpload(e, 'student')} />
                </label>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">USN</label>
                  <input type="text" value={newStudent.usn} onChange={e => setNewStudent({...newStudent, usn: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Name</label>
                  <input type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Branch</label>
                  <select value={newStudent.branch} onChange={e => setNewStudent({...newStudent, branch: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none">
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Email ID</label>
                  <input type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Section</label>
                  <input type="text" value={newStudent.section} onChange={e => setNewStudent({...newStudent, section: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Academic Year</label>
                  <select value={newStudent.academicYear} onChange={e => setNewStudent({...newStudent, academicYear: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none">
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Batch Name</label>
                  <input type="text" value={newStudent.batchName} onChange={e => setNewStudent({...newStudent, batchName: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Password</label>
                  <input type="text" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none" placeholder="Default: Atria@2026" />
                </div>
              </div>
              <button 
                onClick={handleAddStudent}
                className="bg-ink text-white px-8 py-3 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                Register Student
              </button>
            </div>

            <h2 className="text-xl font-serif font-semibold text-ink mb-4">Registered Students</h2>
            <div className="bg-white rounded-xl border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-paper/50 text-slate-500 text-xs uppercase tracking-wider border-b border-black/5">
                    <th className="p-4 font-semibold">USN</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Branch</th>
                    <th className="p-4 font-semibold">Section</th>
                    <th className="p-4 font-semibold">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={i} className="border-b border-black/5 hover:bg-paper/30 transition-colors">
                      <td className="p-4 font-mono text-sm text-ink">{s.usn}</td>
                      <td className="p-4 text-sm text-slate-700 font-medium">{s.name}</td>
                      <td className="p-4 text-sm text-slate-600">{s.branch}</td>
                      <td className="p-4 text-sm text-slate-600">{s.section}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <input 
                          type="text" 
                          defaultValue={s.password} 
                          onBlur={async (e) => {
                            if (e.target.value !== s.password) {
                              try {
                                await supabaseService.updatePassword('student', s.usn, e.target.value);
                                alert('Password updated');
                              } catch (err) {
                                alert('Failed to update password');
                              }
                            }
                          }}
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                        />
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-sm">No students registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AdminPinModal 
        isOpen={showPinDialog} 
        onClose={() => setShowPinDialog(false)} 
        onSuccess={() => setIsAdmin(true)} 
      />

      {/* Change PIN Dialog */}
      {showChangePin && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-black/5">
            <h3 className="text-2xl font-serif text-ink mb-2">Change Admin PIN</h3>
            <p className="text-sm text-slate-500 mb-6">Enter a new PIN for admin access.</p>
            <input
              type="text"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="New PIN"
              className="w-full p-3 border border-black/10 rounded-xl focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all mb-6 text-center tracking-widest text-lg"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowChangePin(false); setNewPin(''); }} className="px-4 py-2 text-slate-600 hover:bg-black/5 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button 
                onClick={async () => {
                  if (newPin.trim().length > 0) {
                    try {
                      await supabaseService.updateAdminPin(newPin.trim());
                      setShowChangePin(false);
                      setNewPin('');
                      alert('Admin PIN updated successfully.');
                    } catch (error) {
                      console.error('Error updating PIN:', error);
                      alert('Failed to update Admin PIN.');
                    }
                  }
                }} 
                className="px-4 py-2 bg-ink text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Save PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
