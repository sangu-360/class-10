import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Cpu, Code2, Database, Zap, BookOpen, Trash2, Moon, Sun } from 'lucide-react';
import { generateContent } from './services/geminiService';
import { AppMode, ChatMessage, SupportedLanguage } from './types';
import CodeEditor from './components/CodeEditor';
import ExecutionWindow from './components/ExecutionWindow';
import ReactMarkdown from 'react-markdown';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SOLVER);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  // Toggle Theme
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Apply Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const data = await generateContent(userMsg.text || "Analyze this image", mode, userMsg.image?.split(',')[1]);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        data: data,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
      setActiveMessageId(aiMsg.id);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error processing your request. Please check your API key and try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setSelectedImage(event.target?.result as string);
        };
        if (blob) reader.readAsDataURL(blob);
      }
    }
  };

  const activeMessage = messages.find(m => m.id === activeMessageId) || messages.filter(m => m.role === 'model').slice(-1)[0];

  return (
    <div className="flex h-screen bg-app text-primary overflow-hidden font-sans transition-colors duration-300">
      
      {/* Left Sidebar / Chat Area (40%) */}
      <div className="w-[40%] flex flex-col border-r border-border bg-sidebar relative z-10 shadow-xl transition-colors duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-sidebar-header backdrop-blur transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="text-white" size={18} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-primary">CodeInsight</h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-tertiary hover:text-primary hover:bg-border transition-all mr-2"
                title="Toggle Theme"
             >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>

             {/* Mode Switcher */}
            <div className="flex bg-border rounded-lg p-1 transition-colors duration-300">
                <button
                onClick={() => setMode(AppMode.SOLVER)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === AppMode.SOLVER ? 'bg-indigo-600 text-white shadow' : 'text-tertiary hover:text-primary'}`}
                >
                Solver
                </button>
                <button
                onClick={() => setMode(AppMode.GENERATOR)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === AppMode.GENERATOR ? 'bg-purple-600 text-white shadow' : 'text-tertiary hover:text-primary'}`}
                >
                Generator
                </button>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-sidebar transition-colors duration-300">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-tertiary space-y-4 opacity-50">
              <Code2 size={48} />
              <p className="text-center text-sm max-w-xs">
                Paste a coding problem (Ctrl+V) or ask me to generate a SQL/Python question.
              </p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`group flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              onClick={() => msg.role === 'model' && setActiveMessageId(msg.id)}
            >
              <div 
                className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm cursor-pointer border transition-all 
                  ${msg.role === 'user' 
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-800 dark:text-indigo-100 rounded-tr-sm' 
                    : `bg-app/50 border-border rounded-tl-sm hover:border-tertiary ${activeMessageId === msg.id ? 'ring-1 ring-indigo-500 border-indigo-500/50' : ''}`
                  }`}
              >
                {/* User Image */}
                {msg.image && (
                  <img src={msg.image} alt="User upload" className="max-h-40 rounded-lg mb-3 border border-indigo-500/20" />
                )}

                {/* Content */}
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                
                {/* AI Structured Content Preview */}
                {msg.data && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-500 font-semibold">
                      <BookOpen size={16} />
                      <span>{msg.data.title}</span>
                    </div>
                    <div className="prose prose-sm max-w-none text-secondary dark:prose-invert">
                      <ReactMarkdown>{msg.data.explanation}</ReactMarkdown>
                    </div>
                    <div className="text-xs text-tertiary mt-2 flex items-center gap-1">
                      Click to view code & execution
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-tertiary px-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-3 p-4 text-tertiary animate-pulse">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
              <span className="text-xs">Processing logic & simulating output...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-sidebar border-t border-border z-20 transition-colors duration-300">
          {selectedImage && (
            <div className="relative inline-block mb-2">
              <img src={selectedImage} alt="Preview" className="h-16 rounded border border-tertiary" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-sm hover:bg-red-600"
              >
                <Trash2 size={10} />
              </button>
            </div>
          )}
          <div className="relative bg-input rounded-xl border border-border shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              placeholder={mode === AppMode.SOLVER ? "Paste code, question, or Ctrl+V image..." : "Describe the topic for a new question..."}
              className="w-full bg-transparent text-sm text-primary placeholder-tertiary p-4 pr-12 min-h-[60px] max-h-[150px] resize-none focus:outline-none custom-scrollbar"
            />
            
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-tertiary hover:text-indigo-500 hover:bg-border rounded-full transition-colors"
                title="Upload Image"
              >
                <Upload size={18} />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </button>
              <button 
                onClick={handleSend}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-tertiary flex justify-between px-1">
            <span>Supports: Python, SQL, DAX, Excel</span>
            <span>Use Ctrl+V to paste screenshots</span>
          </div>
        </div>
      </div>

      {/* Right Content / IDE (60%) */}
      <div className="flex-1 bg-right flex flex-col relative transition-colors duration-300">
        {activeMessage && activeMessage.data ? (
          <div className="flex flex-col h-full p-4 gap-4">
             {/* Info Strip */}
             <div className="flex items-center justify-between text-tertiary text-xs px-1">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-indigo-400" />
                    <span>Context: <span className="text-secondary font-medium">Retail Sales Demo DB</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span>Read Only</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Cpu size={14} />
                        <span>Simulated Execution</span>
                    </div>
                </div>
             </div>

             {/* Code Editor Area */}
             <div className="flex-1 min-h-0 flex flex-col gap-1">
                <label className="text-xs font-semibold text-tertiary uppercase tracking-wider pl-1">Source Code</label>
                <CodeEditor code={activeMessage.data.code} language={activeMessage.data.language} />
             </div>

             {/* Execution Window Area */}
             <div className="h-[40%] min-h-[200px] flex flex-col gap-1">
                <label className="text-xs font-semibold text-tertiary uppercase tracking-wider pl-1">Terminal / Output</label>
                <ExecutionWindow result={activeMessage.data.executionOutput} />
             </div>
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-tertiary space-y-6">
                <div className="w-24 h-24 rounded-full bg-border/50 flex items-center justify-center border border-border shadow-2xl">
                    <Code2 size={40} className="opacity-50" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-medium text-secondary">Ready to Code</h3>
                    <p className="text-sm max-w-md mx-auto">
                        Select a conversation from the left or start a new query to see the code, logic, and simulated execution output here.
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-8 opacity-40">
                    <div className="p-4 border border-border rounded bg-app">
                        <div className="h-2 w-20 bg-tertiary rounded mb-2"></div>
                        <div className="h-2 w-32 bg-border rounded"></div>
                    </div>
                    <div className="p-4 border border-border rounded bg-app">
                        <div className="h-2 w-20 bg-tertiary rounded mb-2"></div>
                        <div className="h-2 w-32 bg-border rounded"></div>
                    </div>
                </div>
            </div>
        )}
      </div>

    </div>
  );
};

export default App;