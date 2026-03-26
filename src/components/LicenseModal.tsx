'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Key, CheckCircle2, AlertCircle } from 'lucide-react';
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
      setErrorMsg('Please enter a license key');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await activate(licenseKey, email);
      if (result.status === 'pro') {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setErrorMsg(result.error || 'Invalid license key. Please check and try again.');
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-slate-100">
                  {isPro ? 'Pro Unlocked' : 'Free Trial and Upgrade'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {success || isPro ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  <h3 className="text-xl font-bold text-slate-100">License Activated!</h3>
                  <p className="text-slate-400">Thank you for supporting StemSplit. All Pro features are now unlocked.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300">
                    StemSplit is free to download and includes a trial mode out of the box.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300 mb-4">
                    <li>Install and launch StemSplit.</li>
                    <li>Use trial mode immediately.</li>
                    <li>Upgrade in-app when you want full features.</li>
                    <li>Enter your license key to unlock Pro mode.</li>
                  </ol>

                  <form onSubmit={handleActivate} className="space-y-4 mt-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Gumroad License Key
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-400/10 p-3 rounded-lg border border-rose-400/20">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isLoading || !licenseKey.trim()}
                        className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? 'Verifying...' : 'Unlock Pro'}
                      </button>
                      <a
                        href="https://gumroad.com/l/stemsplit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        Buy License
                      </a>
                    </div>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
