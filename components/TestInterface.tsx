import React, { useState, useEffect } from 'react';
import { Test, TestAttempt, QuestionStatus, StudentReg } from '../types';
import QuestionPalette from './QuestionPalette';
import { Clock, Play, AlertCircle, Loader2, Maximize, ShieldAlert } from 'lucide-react';
import { evaluateCode } from '../services/groqService';
import { gradeCodingAnswer } from '../services/geminiService';

interface Props {
  test: Test;
  studentName: string;
  studentData?: StudentReg;
  onSubmit: (attempt: TestAttempt) => void;
}

export default function TestInterface({ test, studentName, studentData, onSubmit }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(() => {
    if (test.scheduledTime) {
      const endTime = new Date(test.scheduledTime).getTime() + test.durationMinutes * 60 * 1000;
      const remaining = Math.floor((endTime - Date.now()) / 1000);
      // Ensure we don't give more than duration, and not less than 0
      return Math.max(0, Math.min(remaining, test.durationMinutes * 60));
    }
    return test.durationMinutes * 60;
  });

  const [codeOutput, setCodeOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [malpracticeCount, setMalpracticeCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMalpracticeWarning, setShowMalpracticeWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeQuestion = test.questions[activeIdx];

  // Anti-Malpractice: Tab Switch Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitting) {
        setMalpracticeCount(prev => prev + 1);
        setShowMalpracticeWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSubmitting]);

  // Anti-Malpractice: Full Screen Enforcement
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);
      if (!isFS && !isSubmitting && timeLeft < test.durationMinutes * 60 - 10) {
        setMalpracticeCount(prev => prev + 1);
        setShowMalpracticeWarning(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [isSubmitting, timeLeft, test.durationMinutes]);

  const enterFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  useEffect(() => {
    const initialStatuses: Record<string, QuestionStatus> = {};
    test.questions.forEach(q => {
      initialStatuses[q.id] = 'not_visited';
      if (q.type === 'coding' && q.initialCode) {
        setAnswers(prev => ({ ...prev, [q.id]: q.initialCode! }));
      }
    });
    initialStatuses[test.questions[0].id] = 'not_answered';
    setStatuses(initialStatuses);
  }, [test]);

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!isSubmitting) {
        handleSubmit();
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers(prev => ({ ...prev, [activeQuestion.id]: e.target.value }));
  };

  const handleOptionSelect = (idx: number) => {
    setAnswers(prev => ({ ...prev, [activeQuestion.id]: idx }));
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setCodeOutput('Compiling and running...');
    
    try {
      const code = (answers[activeQuestion.id] as string) || '';
      const output = await evaluateCode(code, test.subject);
      setCodeOutput(output);
    } catch (error) {
      setCodeOutput('Error: Failed to execute code.');
    } finally {
      setIsExecuting(false);
    }
  };

  const updateStatusAndMove = (newStatus: QuestionStatus, moveNext: boolean = true) => {
    setStatuses(prev => ({ ...prev, [activeQuestion.id]: newStatus }));
    if (moveNext && activeIdx < test.questions.length - 1) {
      const nextIdx = activeIdx + 1;
      setActiveIdx(nextIdx);
      setStatuses(prev => {
        if (prev[test.questions[nextIdx].id] === 'not_visited') {
          return { ...prev, [test.questions[nextIdx].id]: 'not_answered' };
        }
        return prev;
      });
      setCodeOutput(''); // Clear console on next question
    }
  };

  const handleSaveAndNext = () => {
    const hasAnswer = answers[activeQuestion.id] !== undefined && answers[activeQuestion.id] !== '';
    updateStatusAndMove(hasAnswer ? 'answered' : 'not_answered');
  };

  const handleMarkForReview = () => {
    const hasAnswer = answers[activeQuestion.id] !== undefined && answers[activeQuestion.id] !== '';
    updateStatusAndMove(hasAnswer ? 'answered_marked_for_review' : 'marked_for_review');
  };

  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    if (activeQuestion.type === 'coding') {
      newAnswers[activeQuestion.id] = activeQuestion.initialCode || '';
    } else {
      delete newAnswers[activeQuestion.id];
    }
    setAnswers(newAnswers);
    setStatuses(prev => ({ ...prev, [activeQuestion.id]: 'not_answered' }));
    setCodeOutput('');
  };

  const handleQuestionSelect = (idx: number) => {
    setActiveIdx(idx);
    setCodeOutput('');
    setStatuses(prev => {
      if (prev[test.questions[idx].id] === 'not_visited') {
        return { ...prev, [test.questions[idx].id]: 'not_answered' };
      }
      return prev;
    });
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    let score = 0;
    let totalMarks = 0;
    const feedback: Record<string, string> = {};
    const scores: Record<string, number> = {};

    for (const q of test.questions) {
      totalMarks += q.marks;
      if (q.type !== 'coding') {
        if (answers[q.id] === q.correctAnswer) {
          score += q.marks;
          scores[q.id] = q.marks;
        } else {
          scores[q.id] = 0;
        }
      } else {
        // Evaluate coding question
        const studentCode = answers[q.id] as string || '';
        const evaluation = await gradeCodingAnswer(q.text, studentCode, q.marks);
        score += evaluation.score;
        scores[q.id] = evaluation.score;
        feedback[q.id] = evaluation.feedback;
      }
    }

    const attempt: TestAttempt = {
      id: Date.now().toString(),
      testId: test.id,
      studentName,
      usn: studentData?.usn,
      section: studentData?.section,
      branch: studentData?.branch,
      answers,
      status: statuses,
      score,
      totalMarks,
      submittedAt: Date.now(),
      passed: score >= test.passMarks,
      feedback,
      scores,
      malpracticeCount // Store malpractice count
    };

    setIsSubmitting(false);
    onSubmit(attempt);
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (timeLeft > 0) {
      setShowSubmitModal(true);
    } else {
      confirmSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-paper font-sans text-ink select-none">
      {/* Full Screen Overlay */}
      {!isFullScreen && !isSubmitting && (
        <div className="fixed inset-0 bg-ink z-[100] flex flex-col items-center justify-center p-8 text-center">
          <ShieldAlert size={64} className="text-olive mb-6 animate-bounce" />
          <h2 className="text-4xl font-serif text-paper mb-4">Secure Exam Mode Required</h2>
          <p className="text-paper/60 max-w-md mb-8">
            To maintain academic integrity, this assessment must be taken in full-screen mode. 
            Exiting full-screen or switching tabs will be recorded as a malpractice attempt.
          </p>
          <button 
            onClick={enterFullScreen}
            className="bg-olive text-white px-10 py-4 rounded-xl font-bold tracking-widest uppercase hover:bg-olive/90 transition-all flex items-center gap-3"
          >
            <Maximize size={20} /> Enter Secure Mode
          </button>
        </div>
      )}

      {/* Malpractice Warning Modal */}
      {showMalpracticeWarning && (
        <div className="fixed inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center z-[110]">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border-2 border-red-500 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ink mb-2">Malpractice Warning!</h3>
            <p className="text-slate-600 mb-6">
              A tab switch or full-screen exit was detected. This incident has been recorded. 
              Multiple violations may lead to automatic disqualification.
            </p>
            <p className="text-xs font-mono text-red-500 mb-6">Violation Count: {malpracticeCount}</p>
            <button 
              onClick={() => {
                setShowMalpracticeWarning(false);
                if (!isFullScreen) enterFullScreen();
              }}
              className="w-full bg-ink text-white py-3 rounded-xl font-bold uppercase tracking-wider"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-black/5 px-8 py-4 flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-serif text-ink leading-tight">{test.title}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{test.subject}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{test.topic}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${timeLeft < 300 ? 'border-red-200 bg-red-50 text-red-600' : 'border-black/10 bg-white text-ink'}`}>
            <Clock size={18} className={timeLeft < 300 ? 'animate-pulse' : ''} />
            <span className={`font-mono text-lg tracking-tight ${timeLeft < 300 ? 'font-bold' : 'font-medium'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="text-right border-l border-black/10 pl-8">
            <p className="font-serif text-lg leading-none">{studentName}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mt-1">Candidate</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 1st Screen: Question Palette */}
        <div className="w-80 p-6 border-r border-black/5 bg-paper overflow-y-auto shrink-0">
          <QuestionPalette 
            totalQuestions={test.questions.length}
            statuses={statuses}
            activeQuestionIndex={activeIdx}
            onQuestionSelect={handleQuestionSelect}
            questionIds={test.questions.map(q => q.id)}
          />
        </div>

        {/* 2nd Screen: Question Text & Options */}
        <div className="flex-1 flex flex-col bg-white border-r border-black/5">
          <div className="flex-1 p-10 overflow-y-auto">
            <div className="flex justify-between items-end mb-8 border-b border-black/5 pb-4">
              <h2 className="text-3xl font-serif text-ink">Question {activeIdx + 1}</h2>
              <div className="flex gap-3 text-[10px] uppercase tracking-wider font-bold">
                <span className="bg-olive/10 text-olive px-3 py-1.5 rounded-full">+{activeQuestion.marks} Marks</span>
                <span className="bg-red-50 text-red-800 px-3 py-1.5 rounded-full">-0.00 Marks</span>
              </div>
            </div>

            <div className="prose max-w-none mb-10">
              <p className="text-lg text-ink leading-relaxed whitespace-pre-wrap">{activeQuestion.text}</p>
            </div>

            {activeQuestion.type !== 'coding' && activeQuestion.options && (
              <div className="space-y-4">
                {activeQuestion.options.map((opt, idx) => (
                  <label 
                    key={idx} 
                    onClick={() => handleOptionSelect(idx)}
                    className={`flex items-center p-5 border rounded-xl cursor-pointer transition-all duration-200
                      ${answers[activeQuestion.id] === idx ? 'border-ink bg-slate-50 shadow-sm' : 'border-black/10 hover:border-black/30 hover:bg-slate-50/50'}
                    `}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 transition-colors ${answers[activeQuestion.id] === idx ? 'border-ink' : 'border-slate-300'}`}>
                      {answers[activeQuestion.id] === idx && <div className="w-2.5 h-2.5 bg-ink rounded-full"></div>}
                    </div>
                    <span className="text-ink text-lg">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-black/5 p-6 bg-white flex justify-between items-center">
            <div className="flex gap-4">
              <button 
                onClick={handleMarkForReview}
                className="px-6 py-3 border border-black/10 text-ink rounded-xl hover:bg-slate-50 text-sm font-semibold tracking-wide transition-colors"
              >
                Mark for Review & Next
              </button>
              <button 
                onClick={handleClearResponse}
                className="px-6 py-3 text-slate-500 hover:text-ink text-sm font-semibold tracking-wide transition-colors"
              >
                Clear Response
              </button>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={handleSaveAndNext}
                className="px-8 py-3 bg-green-200 text-green-900 rounded-xl hover:bg-green-300 text-sm font-semibold tracking-wide transition-colors"
              >
                Save & Next
              </button>
              <button 
                onClick={handleSubmit}
                className="px-8 py-3 bg-green-800 text-white rounded-xl hover:bg-green-900 text-sm font-semibold tracking-wide transition-colors ml-4"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>

        {/* 3rd Screen: IDE and Console (Only for coding questions) */}
        {activeQuestion.type === 'coding' && (
          <div className="flex-1 flex flex-col bg-[#1e1e1e] text-gray-300 min-w-[450px]">
            <div className="flex items-center justify-between px-6 py-3 bg-[#252526] border-b border-[#3c3c3c]">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Code Editor ({test.subject})</span>
              <button 
                onClick={handleRunCode}
                disabled={isExecuting}
                className="flex items-center gap-2 bg-olive hover:bg-[#4a4a35] text-white px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors disabled:opacity-50"
              >
                <Play size={14} /> {isExecuting ? 'Running...' : 'Run Code'}
              </button>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                value={(answers[activeQuestion.id] as string) || ''}
                onChange={handleCodeChange}
                onPaste={(e) => {
                  e.preventDefault();
                  alert('Pasting code is disabled during the assessment to ensure academic integrity.');
                }}
                spellCheck={false}
                className="absolute inset-0 w-full h-full bg-transparent text-gray-300 font-mono text-sm p-6 resize-none focus:outline-none leading-relaxed"
                style={{ tabSize: 2 }}
              />
            </div>

            <div className="h-1/3 border-t border-[#3c3c3c] flex flex-col bg-[#1e1e1e]">
              <div className="px-6 py-2 bg-[#252526] border-b border-[#3c3c3c] text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                Console Output
              </div>
              <div className="flex-1 p-6 font-mono text-sm overflow-y-auto whitespace-pre-wrap text-gray-300 leading-relaxed">
                {codeOutput || 'Click "Run Code" to see output here...'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full border border-black/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-2xl font-serif text-ink">Submit Assessment?</h3>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed">
              You still have <span className="font-semibold text-ink">{formatTime(timeLeft)}</span> remaining. Are you sure you want to submit your test now? You won't be able to change your answers after submission.
            </p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="px-6 py-3 border border-black/10 text-ink rounded-xl hover:bg-slate-50 text-sm font-semibold tracking-wide transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-800 text-white rounded-xl hover:bg-green-900 text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Grading...</> : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
