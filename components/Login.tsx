import React, { useState } from 'react';
import { Role } from '../types';
import { ArrowRight, AlertCircle } from 'lucide-react';
import Logo from './Logo';
import AdminPinModal from './AdminPinModal';
import { supabaseService } from '../services/supabaseService';

interface LoginProps {
  onLogin: (role: Role, name: string, data?: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [role, setRole] = useState<Role>('student');
  const [showPinDialog, setShowPinDialog] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await supabaseService.login(loginEmail, loginPassword);
      if (user) {
        onLogin(user.role, user.name, user.data);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-paper font-sans">
      {/* Left Pane - Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #5A5A40 0%, transparent 50%)' }}></div>
        <div className="relative z-10">
          <Logo light className="mb-16" onAdminTrigger={() => setShowPinDialog(true)} />
          
          <h1 className="text-6xl font-serif font-light leading-tight mb-6">
            Elevate <br />
            <span className="italic text-olive">academic</span> <br />
            assessment.
          </h1>
          <p className="text-paper/60 max-w-md leading-relaxed">
            Atria Institute of Technology's professional platform designed for seamless evaluation, comprehensive analytics, and collaborative learning.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-xs tracking-widest uppercase text-paper/40">
          <span>Est. 2026</span>
          <div className="w-8 h-[1px] bg-paper/20"></div>
          <span>Atria Institute of Technology</span>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Logo className="lg:hidden mb-8" onAdminTrigger={() => setShowPinDialog(true)} />
            <h2 className="text-3xl font-serif text-ink mb-2">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your credentials to access the Atria portal.
            </p>
          </div>

          {/* Role Selector */}
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-3 border-b-2 text-sm font-medium transition-colors ${role === 'student' ? 'border-ink text-ink' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 py-3 border-b-2 text-sm font-medium transition-colors ${role === 'teacher' ? 'border-ink text-ink' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Faculty
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none text-ink"
                placeholder="name@university.edu"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 border-b border-slate-300 focus:border-ink focus:outline-none bg-transparent transition-colors rounded-none text-ink"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ink text-white py-4 mt-6 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <span className="text-sm tracking-widest uppercase font-semibold">
                {isLoading ? 'Signing In...' : 'Sign In'}
              </span>
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </div>

      <AdminPinModal 
        isOpen={showPinDialog} 
        onClose={() => setShowPinDialog(false)} 
        onSuccess={() => onLogin('teacher', 'Admin')} 
      />
    </div>
  );
}
