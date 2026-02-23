import React from 'react';
import { ExecutionResult } from '../types';
import { Terminal, Table, AlertCircle } from 'lucide-react';

interface ExecutionWindowProps {
  result: ExecutionResult;
}

const ExecutionWindow: React.FC<ExecutionWindowProps> = ({ result }) => {
  const isTable = result.outputType === 'table' && Array.isArray(result.content);
  
  return (
    <div className="flex flex-col h-full bg-right border border-border rounded-md overflow-hidden shadow-sm transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center px-4 py-2 bg-editor-sidebar border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-tertiary">
          {isTable ? <Table size={14} /> : <Terminal size={14} />}
          <span>EXECUTION OUTPUT</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] text-green-500">Live Connection (Demo DB)</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-0 font-mono text-sm bg-right transition-colors duration-300 relative">
        {result.outputType === 'error' ? (
          <div className="text-red-400 flex items-start gap-2 p-4">
            <AlertCircle size={16} className="mt-0.5" />
            <pre className="whitespace-pre-wrap">{String(result.content)}</pre>
          </div>
        ) : isTable ? (
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr>
                  {(result.content as string[][])[0]?.map((header: string, i: number) => (
                    <th key={i} className="border-b border-border py-2 px-3 text-secondary font-medium bg-editor-sidebar whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(result.content as string[][]).slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-editor-sidebar/50 transition-colors">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border-b border-border py-2 px-3 text-secondary whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 text-xs text-tertiary italic sticky left-0">
              Showing {(result.content as string[][]).length - 1} rows.
            </div>
          </div>
        ) : (
          <div className="text-secondary whitespace-pre-wrap p-4">
            <span className="text-green-500 mr-2">➜</span>
            {String(result.content)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionWindow;