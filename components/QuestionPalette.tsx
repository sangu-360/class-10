import React from 'react';
import { QuestionStatus } from '../types';

interface Props {
  totalQuestions: number;
  statuses: Record<string, QuestionStatus>;
  activeQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
  questionIds: string[];
}

export default function QuestionPalette({ totalQuestions, statuses, activeQuestionIndex, onQuestionSelect, questionIds }: Props) {
  const getStatusColor = (status: QuestionStatus) => {
    switch (status) {
      case 'answered': return 'bg-yellow-500 text-white border-yellow-600';
      case 'not_answered': return 'bg-red-500 text-white border-red-600';
      case 'marked_for_review': return 'bg-purple-500 text-white border-purple-600';
      case 'answered_marked_for_review': return 'bg-green-500 text-white border-green-600';
      case 'not_visited': default: return 'bg-paper text-ink border-black/10';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col h-full font-sans">
      <h3 className="font-serif text-xl text-ink mb-6 border-b border-black/5 pb-4">Question Palette</h3>
      
      <div className="grid grid-cols-4 gap-3 mb-6 overflow-y-auto flex-1 content-start pr-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const qId = questionIds[idx];
          const status = statuses[qId] || 'not_visited';
          const isActive = activeQuestionIndex === idx;
          
          return (
            <button
              key={idx}
              onClick={() => onQuestionSelect(idx)}
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border transition-all duration-200
                ${getStatusColor(status)}
                ${isActive ? 'ring-2 ring-offset-2 ring-ink scale-110' : 'hover:scale-105'}
              `}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 space-y-3 border-t border-black/5 pt-6">
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-yellow-500 rounded-full"></div> Answered</div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-red-500 rounded-full"></div> Not Answered</div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-paper border border-black/10 rounded-full"></div> Not Visited</div>
        <div className="flex items-center gap-3"><div className="w-4 h-4 bg-purple-500 rounded-full"></div> Marked for Review</div>
        <div className="flex items-center gap-3 relative">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="ml-2">Answered & Marked</span>
        </div>
      </div>
    </div>
  );
}
