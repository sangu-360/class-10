import React from 'react';
import { Test, TestAttempt, StudentReg } from '../types';
import { PlayCircle, CheckCircle, Clock, LogOut, BookOpen, AlertCircle } from 'lucide-react';
import Logo from './Logo';
import AdminPinModal from './AdminPinModal';

interface Props {
  studentName: string;
  studentData?: StudentReg;
  tests: Test[];
  attempts: TestAttempt[];
  onStartTest: (test: Test) => void;
  onReviewTest: (test: Test, attempt: TestAttempt) => void;
  onLogout: () => void;
  onAdminAccess?: () => void;
}

export default function StudentDashboard({ studentName, studentData, tests, attempts, onStartTest, onReviewTest, onLogout, onAdminAccess }: Props) {
  const [showPinDialog, setShowPinDialog] = React.useState(false);

  const isExpired = (test: Test) => {
    if (!test.scheduledTime) return false;
    const endTime = new Date(test.scheduledTime).getTime() + test.durationMinutes * 60 * 1000;
    return Date.now() > endTime;
  };

  const filteredTests = tests.filter(test => {
    // If no targeting, show to all
    if (!test.targetBranch && !test.targetSection) return true;
    
    // If targeting, check if student matches
    if (test.targetBranch && studentData?.branch !== test.targetBranch) return false;
    if (test.targetSection && studentData?.section !== test.targetSection) return false;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Logo onAdminTrigger={() => setShowPinDialog(true)} />
          <span className="text-xs tracking-widest uppercase font-semibold border-l border-black/10 pl-3">Student Portal</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-slate-600">Welcome, {studentName}</span>
          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-slate-500 hover:text-ink transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 lg:p-12">
        <div className="mb-12">
          <h2 className="text-4xl font-serif font-light text-ink mb-2">Available Assessments</h2>
          <p className="text-slate-500 text-sm">Select a test to begin or review your past attempts.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTests.map(test => {
            const attempt = attempts.find(a => a.testId === test.id);
            
            return (
              <div key={test.id} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-300">
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-serif text-2xl text-ink leading-tight">{test.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-sand/50 text-ink text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full">{test.subject}</span>
                    <span className="bg-sand/50 text-ink text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full">{test.topic}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 mb-6">
                    <div className="flex items-center gap-2"><Clock size={16} /> {test.durationMinutes} mins</div>
                    <div className="flex items-center gap-2"><BookOpen size={16} /> {test.questions.length} Qs</div>
                    {test.scheduledTime && (
                      <div className="flex items-center gap-2 w-full mt-2 text-ink font-medium">
                        <Clock size={16} className="text-slate-400" /> Scheduled: {new Date(test.scheduledTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  {attempt && (
                    <div className={`mt-auto p-4 rounded-xl border ${attempt.passed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Previous Attempt</p>
                      <div className="flex justify-between items-end">
                        <div className="flex items-baseline gap-1">
                          <span className="font-serif text-2xl">{attempt.score}</span>
                          <span className="text-sm text-slate-500">/ {attempt.totalMarks}</span>
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${attempt.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-black/5 bg-slate-50/50">
                  {attempt ? (
                    <button 
                      onClick={() => onReviewTest(test, attempt)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-black/10 text-ink rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
                    >
                      <CheckCircle size={16} /> Review Answers
                    </button>
                  ) : isExpired(test) ? (
                    <button 
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl text-sm font-medium cursor-not-allowed border border-red-100"
                    >
                      <AlertCircle size={16} /> Test Expired
                    </button>
                  ) : test.scheduledTime && new Date(test.scheduledTime) > new Date() ? (
                    <button 
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-200 text-slate-500 rounded-xl text-sm font-medium cursor-not-allowed"
                    >
                      <PlayCircle size={16} /> Starts at {new Date(test.scheduledTime).toLocaleString()}
                    </button>
                  ) : (
                    <button 
                      onClick={() => onStartTest(test)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-xl hover:bg-slate-800 text-sm font-medium transition-colors"
                    >
                      <PlayCircle size={16} /> Start Assessment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredTests.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-black/10 text-slate-500">
              <BookOpen size={48} className="text-slate-300 mb-4" />
              <p className="font-serif text-xl text-ink">No assessments available</p>
              <p className="text-sm mt-2">Check back later for new tests.</p>
            </div>
          )}
        </div>
      </main>
      <AdminPinModal 
        isOpen={showPinDialog} 
        onClose={() => setShowPinDialog(false)} 
        onSuccess={() => onAdminAccess?.()} 
      />
    </div>
  );
}
