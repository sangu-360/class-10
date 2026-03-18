import React from 'react';
import { Test, TestAttempt } from '../types';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Code2, Sparkles } from 'lucide-react';

interface Props {
  test: Test;
  attempt: TestAttempt;
  onBack: () => void;
  onlyWrong?: boolean;
}

export default function TestReview({ test, attempt, onBack, onlyWrong = false }: Props) {
  const questionsToShow = onlyWrong 
    ? test.questions.filter(q => {
        if (q.type === 'coding') return true; // Always review coding questions
        return attempt.answers[q.id] !== q.correctAnswer;
      })
    : test.questions;

  return (
    <div className="min-h-screen bg-paper font-sans text-ink p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center text-xs uppercase tracking-wider font-semibold text-slate-500 hover:text-ink mb-8 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 p-8 mb-10">
          <h1 className="text-3xl font-serif text-ink mb-6 border-b border-black/5 pb-4">Review: {test.title}</h1>
          <div className="flex flex-wrap gap-8 text-sm text-slate-600">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1">Candidate</p>
              <p className="font-serif text-xl text-ink">{attempt.studentName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1">Final Score</p>
              <p className="font-serif text-xl text-ink">{attempt.score} <span className="text-sm text-slate-500">/ {attempt.totalMarks}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-1">Status</p>
              <p className={`font-serif text-xl ${attempt.passed ? 'text-emerald-600' : 'text-red-600'}`}>{attempt.passed ? 'Passed' : 'Failed'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {questionsToShow.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-black/10 text-slate-500">
              <CheckCircle size={48} className="text-slate-300 mb-4 mx-auto" />
              <p className="font-serif text-xl text-ink">Perfect Score!</p>
              <p className="text-sm mt-2">No incorrect answers to review.</p>
            </div>
          ) : (
            questionsToShow.map((q, idx) => {
              const studentAns = attempt.answers[q.id];
              const isUnanswered = studentAns === undefined || studentAns === '';
              
              let isCorrect = false;
              let codingScore = 0;
              let codingFeedback = '';
              if (q.type !== 'coding') {
                isCorrect = studentAns === q.correctAnswer;
              } else {
                codingScore = attempt.scores?.[q.id] || 0;
                codingFeedback = attempt.feedback?.[q.id] || 'No feedback available.';
              }

              return (
                <div key={q.id} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden">
                  <div className={`p-6 border-b flex justify-between items-center ${q.type === 'coding' ? 'bg-slate-50 border-black/5' : isCorrect ? 'bg-emerald-50/50 border-emerald-100' : isUnanswered ? 'bg-amber-50/50 border-amber-100' : 'bg-red-50/50 border-red-100'}`}>
                    <h3 className="font-serif text-xl text-ink">Question {onlyWrong ? 'Review' : idx + 1} {q.type === 'coding' && <span className="text-sm font-sans text-slate-500 ml-2">(Coding)</span>}</h3>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
                      {q.type === 'coding' ? (
                        <><Code2 size={16} className="text-slate-500" /><span className="text-slate-600">AI Graded ({codingScore}/{q.marks} Marks)</span></>
                      ) : isCorrect ? (
                        <><CheckCircle size={16} className="text-emerald-600" /><span className="text-emerald-700">Correct (+{q.marks})</span></>
                      ) : isUnanswered ? (
                        <><AlertTriangle size={16} className="text-amber-600" /><span className="text-amber-700">Unanswered (0)</span></>
                      ) : (
                        <><XCircle size={16} className="text-red-600" /><span className="text-red-700">Incorrect (0)</span></>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <p className="text-lg text-ink mb-8 leading-relaxed whitespace-pre-wrap">{q.text}</p>
                    
                    {q.type === 'coding' ? (
                      <div className="mb-8">
                        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">Student's Code Submission</h4>
                        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-black/10 mb-6">
                          <div className="px-6 py-3 bg-[#252526] border-b border-[#3c3c3c] text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                            {test.subject} Code
                          </div>
                          <pre className="p-6 text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {studentAns || <span className="text-gray-500 italic">No code submitted</span>}
                          </pre>
                        </div>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <Sparkles size={14} /> AI Evaluation Feedback
                          </h4>
                          <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{codingFeedback}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-8">
                        {q.options?.map((opt, oIdx) => {
                          let optionClass = "border-black/10 text-slate-600";
                          let icon = null;

                          if (oIdx === q.correctAnswer) {
                            optionClass = "border-emerald-500 bg-emerald-50/50 text-emerald-900 font-medium shadow-sm";
                            icon = <CheckCircle size={20} className="text-emerald-600 ml-auto" />;
                          } else if (oIdx === studentAns) {
                            optionClass = "border-red-500 bg-red-50/50 text-red-900 shadow-sm";
                            icon = <XCircle size={20} className="text-red-600 ml-auto" />;
                          }

                          return (
                            <div key={oIdx} className={`flex items-center p-4 border rounded-xl transition-colors ${optionClass}`}>
                              <span className={`w-8 h-8 flex items-center justify-center rounded-full border mr-4 text-sm font-medium ${oIdx === q.correctAnswer ? 'border-emerald-500 bg-white' : oIdx === studentAns ? 'border-red-500 bg-white' : 'border-slate-300 bg-slate-50'}`}>
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="text-lg">{opt}</span>
                              {icon}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="bg-sand/30 border border-black/5 rounded-xl p-6 text-sm text-ink">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-olive block mb-2">Explanation / Expected Solution</span>
                        <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700">{q.explanation}</pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
