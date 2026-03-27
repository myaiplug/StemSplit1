'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, CheckCircle2, AlertCircle, Cpu, Unlock } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LicenseModal({ isOpen, onClose }: LicenseModalProps) {
  const { isPro, activate } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setErrorMsg('SYS_ERR: Missing required license parameter.');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await activate(licenseKey, email);
      if (result.status === 'pro') {
        setSuccess(true);
        setTimeout(() => onClose(), 2500);
      } else {
        setErrorMsg(result.error || 'INVALID_KEY: Authentication rejected by host.');
      }
    } catch (err: any) {
      setErrorMsg(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg mx-4 bg-slate-950 border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden"
          >
            {/* Top Hardware Bezel */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-80" />
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/30 bg-slate-900/50 relative overflow-hidden">
              {/* Scanline overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <Cpu className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold font-mono tracking-widest text-amber-400 uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                  {isPro ? 'System Unlocked' : 'Pro Authorization'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 p-1.5 rounded-md hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-amber-400 transition-colors" />
              </button>
            </div>

            <div className="px-8 py-8 relative">
              {/* Subtle background tech circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-amber-500/5 rounded-full pointer-events-none" />

              {success || isPro ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-6 space-y-4 text-center relative z-10"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full" />
                    <CheckCircle2 className="relative w-20 h-20 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-mono text-emerald-400 mb-2 tracking-wider">LICENSE VERIFIED</h3>
                    <p className="text-emerald-500/70 font-mono text-sm uppercase tracking-widest">Quantum stems initialized. All systems go.</p>
                  </div>
                </motion.div>
              ) : (
                <div className="relative z-10">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-8">
                    <h3 className="text-amber-500/80 font-mono text-xs font-bold tracking-[0.2em] mb-3 uppercase">Status: Trial Mode Active</h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-light font-mono">
                      StemSplit operates in a sandboxed evaluation mode by default. To bypass algorithmic limits and unleash the full Roformer tensor processing, input your assigned cryptographic license key below.
                    </p>
                  </div>

                  <form onSubmit={handleActivate} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-amber-500/70 uppercase">
                        Gumroad Authentication Key
                      </label>
                      <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 group-focus-within:text-amber-400 transition-colors" />
                        <input
                          type="text"
                          value={licenseKey}
                          onChange={(e) => setLicenseKey(e.target.value)}
                          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                          className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg py-4 pl-12 pr-4 text-lg font-mono text-amber-300 placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-inner transition-all drop-shadow-[0_0_5px_rgba(245,158,11,0)] focus:drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-3 text-red-400 text-sm bg-red-950/30 p-4 rounded-lg border border-red-900/50 font-mono overflow-hidden"
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <p>{errorMsg}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={isLoading || !licenseKey.trim()}
                        className="flex-1 relative group overflow-hidden rounded-lg bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-400 opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="relative px-6 py-4 flex items-center justify-center gap-2">
                          <Unlock className="w-5 h-5 text-slate-950" />
                          <span className="font-mono font-bold text-slate-950 uppercase tracking-widest text-sm">
                            {isLoading ? 'Verifying Link...' : 'Execute Override'}
                          </span>
                        </div>
                      </button>
                      <a
                        href="https://gumroad.com/l/stemsplit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all font-mono text-sm tracking-widest text-slate-400 hover:text-amber-400 text-center uppercase"
                      >
                        Purchase
                      </a>
                    </div>
                  </form>
                </div>
              )}
            </div>
            
            {/* Bottom Hardware Screws / Accents */}
            <div className="h-8 bg-slate-900/80 border-t border-slate-800/50 flex justify-between items-center px-4">
               <div className="w-2 h-2 rounded-full bg-slate-800 shadow-inner" />
               <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className="w-1 h-3 rounded-full bg-slate-800" />
                 ))}
               </div>
               <div className="w-2 h-2 rounded-full bg-slate-800 shadow-inner" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
