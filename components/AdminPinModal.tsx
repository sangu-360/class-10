import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminPinModal({ isOpen, onClose, onSuccess }: AdminPinModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [adminPin, setAdminPin] = useState('831067');

  useEffect(() => {
    if (isOpen) {
      const fetchPin = async () => {
        try {
          const pin = await supabaseService.getAdminPin();
          if (pin) setAdminPin(pin);
        } catch (error) {
          console.error('Error fetching admin pin:', error);
        }
      };
      fetchPin();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnlock = () => {
    if (pinInput === adminPin) {
      onSuccess();
      onClose();
      setPinInput('');
    } else {
      alert('Incorrect PIN');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full border border-black/5">
        <h3 className="text-xl font-serif text-ink mb-2 text-center">Admin Access</h3>
        <p className="text-xs text-slate-500 mb-6 text-center">Enter PIN to unlock admin features.</p>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder="Enter PIN"
          className="w-full p-3 border border-black/10 rounded-xl focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all mb-6 text-center tracking-widest text-lg"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUnlock();
          }}
        />
        <div className="flex justify-center gap-3">
          <button onClick={() => { onClose(); setPinInput(''); }} className="px-4 py-2 text-slate-600 hover:bg-black/5 rounded-lg text-sm font-medium transition-colors">Cancel</button>
          <button 
            onClick={handleUnlock} 
            className="px-6 py-2 bg-ink text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
