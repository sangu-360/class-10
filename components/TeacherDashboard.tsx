import React, { useState, useEffect, useRef } from 'react';
import { Test, TestAttempt, Subject, Question, Faculty, SubjectReg, StudentReg, BranchReg, Role } from '../types';
import { 
  Plus, Users, BarChart3, Settings, Sparkles, X, Code2, UserPlus, 
  BookOpen, GraduationCap, Lock, Unlock, Building2, FileSpreadsheet, 
  Upload, Download, ShieldAlert, Clock, CheckCircle2, AlertCircle,
  TrendingUp, LayoutDashboard, BookMarked
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
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
  onLogout: () => void;
}

export default function TeacherDashboard({ user, tests, attempts, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'faculty-reg' | 'subject-reg' | 'student-reg' | 'branch-reg'>('analytics');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview' | 'ongoing' | 'pending' | 'previous' | 'malpractice' | 'student' | 'faculty'>('overview');
  const [reviewAttempt, setReviewAttempt] = useState<{test: Test, attempt: TestAttempt} | null>(null);

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
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-ink text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}>
            <LayoutDashboard size={18} /> Analytics Dashboard
          </button>
          
          {!isAdmin && (
            <div className="pt-4 mt-4 border-t border-black/5">
              <button onClick={() => setShowPinDialog(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">
                <Lock size={18} /> Admin Access
              </button>
            </div>
          )}

          {isAdmin && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Registrations</p>
              </div>
              <button onClick={() => setActiveTab('branch-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'branch-reg' ? 'bg-ink text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}>
                <Building2 size={18} /> Branch / Dept
              </button>
              <button onClick={() => setActiveTab('faculty-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'faculty-reg' ? 'bg-ink text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}>
                <UserPlus size={18} /> Faculty
              </button>
              <button onClick={() => setActiveTab('subject-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'subject-reg' ? 'bg-ink text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}>
                <BookMarked size={18} /> Subject
              </button>
              <button onClick={() => setActiveTab('student-reg')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'student-reg' ? 'bg-ink text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}>
                <GraduationCap size={18} /> Student
              </button>
              <div className="pt-4 mt-4 border-t border-black/5">
                <button onClick={() => setShowChangePin(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-black/5">
                  <Settings size={18} /> Change Admin PIN
                </button>
                <button onClick={() => {
                  setIsAdmin(false);
                  setActiveTab('analytics');
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
            
            <div className="flex gap-2 mb-6 border-b border-black/10 pb-2 overflow-x-auto scrollbar-hide">
              {[
                { id: 'overview', label: 'Leaderboard', icon: TrendingUp },
                { id: 'ongoing', label: 'Ongoing', icon: Clock },
                { id: 'pending', label: 'Pending', icon: AlertCircle },
                { id: 'previous', label: 'Previous', icon: CheckCircle2 },
                { id: 'malpractice', label: 'Malpractice', icon: ShieldAlert },
                { id: 'student', label: 'Student Wise', icon: GraduationCap },
                { id: 'faculty', label: 'Faculty Wise', icon: UserPlus },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setAnalyticsSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${analyticsSubTab === tab.id ? 'bg-ink text-white shadow-md' : 'text-slate-600 hover:bg-black/5'}`}
                >
                  <tab.icon size={16} />
                  {tab.label}
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

            {analyticsSubTab === 'ongoing' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-serif font-semibold text-ink flex items-center gap-2">
                    <Clock className="text-amber-600" /> Ongoing Tests
                  </h3>
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">LIVE NOW</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tests.filter(t => {
                    const start = new Date(t.scheduledTime);
                    const end = new Date(start.getTime() + t.durationMinutes * 60000);
                    const now = new Date();
                    return start <= now && now < end;
                  }).map(test => (
                    <div key={test.id} className="bg-white p-6 rounded-xl border-l-4 border-amber-500 shadow-sm">
                      <h4 className="text-lg font-serif font-bold text-ink mb-2">{test.title}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                        <p><span className="font-semibold">Subject:</span> {test.subjectName}</p>
                        <p><span className="font-semibold">Faculty:</span> {test.facultyName}</p>
                        <p><span className="font-semibold">Started:</span> {new Date(test.scheduledTime).toLocaleTimeString()}</p>
                        <p><span className="font-semibold">Duration:</span> {test.durationMinutes}m</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active Students</p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-2/3"></div>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-600">Monitoring...</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tests.filter(t => {
                    const start = new Date(t.scheduledTime);
                    const end = new Date(start.getTime() + t.durationMinutes * 60000);
                    const now = new Date();
                    return start <= now && now < end;
                  }).length === 0 && (
                    <div className="col-span-2 bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
                      <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-serif">No tests are currently in progress.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analyticsSubTab === 'pending' && (
              <div className="space-y-6">
                <h3 className="text-xl font-serif font-semibold text-ink flex items-center gap-2">
                  <AlertCircle className="text-blue-600" /> Upcoming Tests
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tests.filter(t => new Date(t.scheduledTime) > new Date()).sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()).map(test => (
                    <div key={test.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Scheduled</span>
                        <Clock size={16} className="text-slate-400" />
                      </div>
                      <h4 className="font-serif font-bold text-ink mb-2">{test.title}</h4>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p className="flex justify-between"><span>Date:</span> <span className="font-medium text-slate-700">{new Date(test.scheduledTime).toLocaleDateString()}</span></p>
                        <p className="flex justify-between"><span>Time:</span> <span className="font-medium text-slate-700">{new Date(test.scheduledTime).toLocaleTimeString()}</span></p>
                        <p className="flex justify-between"><span>Subject:</span> <span className="font-medium text-slate-700">{test.subjectName}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analyticsSubTab === 'previous' && (
              <div className="space-y-6">
                <h3 className="text-xl font-serif font-semibold text-ink flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" /> Completed Tests
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-200">
                        <th className="p-4 font-bold">Test Title</th>
                        <th className="p-4 font-bold">Date</th>
                        <th className="p-4 font-bold">Subject</th>
                        <th className="p-4 font-bold">Attempts</th>
                        <th className="p-4 font-bold">Avg Score</th>
                        <th className="p-4 font-bold">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tests.filter(t => {
                        const start = new Date(t.scheduledTime);
                        const end = new Date(start.getTime() + t.durationMinutes * 60000);
                        return end <= new Date();
                      }).map(test => {
                        const testAttempts = attempts.filter(a => a.testId === test.id);
                        const avgScore = testAttempts.length ? Math.round(testAttempts.reduce((sum, a) => sum + (a.score/a.totalMarks)*100, 0) / testAttempts.length) : 0;
                        const passRate = testAttempts.length ? Math.round((testAttempts.filter(a => a.passed).length / testAttempts.length) * 100) : 0;
                        return (
                          <tr key={test.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-medium text-ink">{test.title}</td>
                            <td className="p-4 text-slate-500 text-sm">{new Date(test.scheduledTime).toLocaleDateString()}</td>
                            <td className="p-4 text-slate-500 text-sm">{test.subjectName}</td>
                            <td className="p-4 font-mono text-sm">{testAttempts.length}</td>
                            <td className="p-4 font-mono text-sm">{avgScore}%</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${passRate >= 70 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                                {passRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analyticsSubTab === 'malpractice' && (
              <div className="space-y-6">
                <h3 className="text-xl font-serif font-semibold text-ink flex items-center gap-2">
                  <ShieldAlert className="text-red-600" /> Malpractice Incidents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {attempts.filter(a => a.malpracticeCount && a.malpracticeCount > 0).sort((a,b) => (b.malpracticeCount || 0) - (a.malpracticeCount || 0)).map(att => {
                    const test = tests.find(t => t.id === att.testId);
                    return (
                      <div key={att.id} className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-start gap-4">
                        <div className="bg-red-50 p-3 rounded-lg text-red-600">
                          <ShieldAlert size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-ink">{att.studentName}</h4>
                            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">{att.malpracticeCount} Incidents</span>
                          </div>
                          <p className="text-sm text-slate-500 mb-2">Test: <span className="font-medium text-slate-700">{test?.title}</span></p>
                          <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 font-mono">
                            Detected multiple window switches and suspicious behavior during the examination.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {attempts.filter(a => a.malpracticeCount && a.malpracticeCount > 0).length === 0 && (
                    <div className="col-span-2 bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
                      <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-4" />
                      <p className="text-slate-500 font-serif">No malpractice incidents detected. All clear!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analyticsSubTab === 'student' && (
              <div className="space-y-8">
                <h3 className="text-xl font-serif font-semibold text-ink flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" /> Student Performance Trends
                </h3>
                {Object.entries(attempts.reduce((acc, att) => {
                  if (!acc[att.studentName]) acc[att.studentName] = [];
                  acc[att.studentName].push(att);
                  return acc;
                }, {} as Record<string, TestAttempt[]>)).map(([student, studentAttempts]) => {
                  const chartData = studentAttempts.map(att => ({
                    test: tests.find(t => t.id === att.testId)?.title || 'Test',
                    score: Math.round((att.score / att.totalMarks) * 100)
                  }));

                  return (
                    <div key={student} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-serif font-bold text-ink">{student}</h4>
                        <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span>Avg: {Math.round(chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length)}%</span>
                          <span>Tests: {chartData.length}</span>
                        </div>
                      </div>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="test" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} domain={[0, 100]} />
                            <Tooltip 
                              contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                              itemStyle={{color: '#4f46e5', fontWeight: 'bold'}}
                            />
                            <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {analyticsSubTab === 'faculty' && (
              <div className="space-y-8">
                <h3 className="text-xl font-serif font-semibold text-ink flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" /> Faculty Performance Trends
                </h3>
                {Object.entries(attempts.reduce((acc, att) => {
                  const test = tests.find(t => t.id === att.testId);
                  const faculty = test?.facultyName || 'Unknown Faculty';
                  if (!acc[faculty]) acc[faculty] = [];
                  acc[faculty].push(att);
                  return acc;
                }, {} as Record<string, TestAttempt[]>)).map(([faculty, facultyAttempts]) => {
                  // Group by test to get average per test for this faculty
                  const testGroups = facultyAttempts.reduce((acc, att) => {
                    if (!acc[att.testId]) acc[att.testId] = [];
                    acc[att.testId].push(att);
                    return acc;
                  }, {} as Record<string, TestAttempt[]>);

                  const chartData = Object.entries(testGroups).map(([testId, atts]) => ({
                    test: tests.find(t => t.id === testId)?.title || 'Test',
                    avgScore: Math.round(atts.reduce((sum, a) => sum + (a.score/a.totalMarks)*100, 0) / atts.length)
                  }));

                  return (
                    <div key={faculty} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-serif font-bold text-ink">{faculty}</h4>
                        <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span>Overall Avg: {Math.round(chartData.reduce((sum, d) => sum + d.avgScore, 0) / chartData.length)}%</span>
                          <span>Tests: {chartData.length}</span>
                        </div>
                      </div>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="test" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} domain={[0, 100]} />
                            <Tooltip 
                              contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                              itemStyle={{color: '#059669', fontWeight: 'bold'}}
                            />
                            <Line type="monotone" dataKey="avgScore" stroke="#059669" strokeWidth={3} dot={{r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
