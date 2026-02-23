import React from 'react';
import { SupportedLanguage } from '../types';

interface CodeEditorProps {
  code: string;
  language: SupportedLanguage;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, language }) => {
  const lines = code.split('\n');

  return (
    <div className="flex flex-col h-full bg-editor text-ide-fg font-mono text-sm overflow-hidden rounded-md border border-border shadow-sm transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-editor-sidebar px-4 py-2 border-b border-border shrink-0 z-20">
        <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">
            {language}
            </span>
            <span className="text-xs text-tertiary">main.{language === 'python' ? 'py' : language === 'sql' ? 'sql' : language === 'dax' ? 'dax' : 'txt'}</span>
        </div>
        <div className="flex gap-1.5 opacity-60">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>

      {/* Editor Viewport */}
      <div className="flex-1 overflow-auto custom-scrollbar relative bg-editor">
        <div className="min-w-fit flex min-h-full">
            {/* Sticky Line Numbers Gutter */}
            <div className="sticky left-0 z-10 flex flex-col items-end px-3 py-4 bg-editor border-r border-border select-none text-tertiary min-w-[3.5rem] text-xs leading-6 shadow-[1px_0_0_0_var(--border-color)]">
            {lines.map((_, i) => (
                <div key={i} className="h-6">{i + 1}</div>
            ))}
            </div>

            {/* Code Content */}
            <div className="flex-1 py-4 px-4 bg-editor whitespace-pre leading-6">
            {lines.map((line, i) => (
                <div key={i} className="h-6">
                <CodeLine line={line} language={language} />
                </div>
            ))}
            </div>
        </div>
      </div>
    </div>
  );
};

const CodeLine: React.FC<{ line: string; language: string }> = ({ line, language }) => {
  // Simple heuristic highlighting
  // Expanded keywords list
  const keywords = [
    // SQL
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'CREATE', 'TABLE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'ROUND', 'DATE',
    // Python
    'def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'pass', 'continue', 'break', 'lambda', 'print', 'True', 'False', 'None',
    // DAX
    'CALCULATE', 'FILTER', 'ALL', 'ALLEXCEPT', 'VALUES', 'DISTINCT', 'RELATED', 'RELATEDTABLE', 'EARLIER', 'EARLIEST', 'SUMX', 'AVERAGEX', 'MAXX', 'MINX', 'COUNTROWS', 'DIVIDE', 'IF', 'SWITCH', 'TRUE', 'FALSE', 'BLANK', 'VAR', 'RETURN'
  ];
  
  // Handle full line comments roughly
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith('//')) {
      return <span style={{ color: 'var(--syntax-comment)' }}>{line}</span>;
  }

  // Tokenize
  const parts = line.split(/(\s+|[(),.\[\]{}])/g); 

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        
        const upper = part.toUpperCase();
        
        if (keywords.includes(upper) || keywords.includes(part)) {
          return <span key={index} style={{ color: 'var(--syntax-keyword)' }} className="font-bold">{part}</span>;
        } else if (part.startsWith('"') || part.startsWith("'") || part.endsWith('"') || part.endsWith("'")) {
          return <span key={index} style={{ color: 'var(--syntax-string)' }}>{part}</span>;
        } else if (!isNaN(Number(part)) && part.trim() !== '') {
          return <span key={index} style={{ color: 'var(--syntax-number)' }}>{part}</span>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export default CodeEditor;