export enum AppMode {
  SOLVER = 'SOLVER',
  GENERATOR = 'GENERATOR'
}

export enum SupportedLanguage {
  PYTHON = 'python',
  SQL = 'sql',
  DAX = 'dax',
  EXCEL = 'excel',
  UNKNOWN = 'text'
}

export interface ExecutionResult {
  outputType: 'text' | 'table' | 'error';
  content: string | string[][]; // Plain text or 2D array for tables
}

export interface AIResponse {
  explanation: string;
  code: string;
  language: SupportedLanguage;
  executionOutput: ExecutionResult;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string; // Base64
  data?: AIResponse;
  timestamp: number;
}
