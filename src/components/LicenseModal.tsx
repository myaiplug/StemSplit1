'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, CheckCircle2, AlertCircle, Crown, Sparkles, Loader2, Lock, Clock } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';
import { testSecurityWebhook } from '@/lib/tauri-bridge';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LicenseModal({ isOpen, onClose }: LicenseModalProps) {
  const { license, loading, activate, deactivate, isPro } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter your Gumroad license key');
      return;
    }
    if (!email.trim()) {
      setError('Please enter the email used for your Gumroad purchase');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsActivating(true);

    try {
      const result = await activate(licenseKey.trim(), email.trim());
      
      if (result.is_valid && !result.is_trial) {
        setSuccess('License activated! You now have full access.');
        setLicenseKey('');
        setEmail('');
      } else if (result.error) {
        setError(result.error);
      } else {
        setError('License could not be validated');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    setError(null);
    setSuccess(null);
    setIsActivating(true);

    try {
      await deactivate();
      setSuccess('License deactivated. You are now on the Trial version.');
    } catch (err) {
      setError(String(err));
    } finally {
      setIsActivating(false);
    }
  };

  const handleTestSecurityWebhook = async () => {
    setError(null);
    setSuccess(null);
    setIsTestingWebhook(true);

    try {
      const result = await testSecurityWebhook();
      if (result.success) {
        setSuccess(`Security alert test delivered: ${result.message}`);
      } else if (result.queued_for_retry) {
        setSuccess(`Security alert test queued for retry: ${result.message}`);
      } else {
        setError(`Security alert test failed: ${result.message}`);
      }
    } catch (err) {
      setError(`Security alert test failed: ${String(err)}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const isTrial = license?.is_trial !== false;
  const isLicensed = license?.is_valid && !license?.is_trial;

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
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2">
                {isLicensed ? (
                  <Crown className="w-5 h-5 text-amber-400" />
                ) : (
                  <Lock className="w-5 h-5 text-slate-400" />
                )}
                <h2 className="text-lg font-semibold text-slate-100">License</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Current Status */}
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Current Status</span>
                  <span className={`text-sm font-semibold uppercase ${isLicensed ? 'text-amber-400' : 'text-slate-400'}`}>
                    {isLicensed ? 'LICENSED' : 'TRIAL'}
                  </span>
                </div>
                
                {license?.email && (
                  <div className="text-xs text-slate-500 mb-1">
                    {license.email}
                  </div>
                )}
                
                {license?.license_key && (
                  <div className="text-xs text-slate-500 font-mono">
                    Key: {license.license_key}
                  </div>
                )}

                {/* Trial Limitations */}
                {isTrial && license?.limitations && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-orange-400 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Trial Limitations:
                    </div>
                    <ul className="space-y-1">
                      <li className="text-xs text-slate-400 flex items-center gap-1.5">
                        <X className="w-3 h-3 text-red-400" />
                        Max {Math.floor(license.limitations.max_duration_seconds / 60)} minute audio files
                      </li>
                      <li className="text-xs text-slate-400 flex items-center gap-1.5">
                        <X className="w-3 h-3 text-red-400" />
                        2-stem separation only (vocals + instrumental)
                      </li>
                      <li className="text-xs text-slate-400 flex items-center gap-1.5">
                        <X className="w-3 h-3 text-red-400" />
                        MP3 output only (no high-quality WAV)
                      </li>
                      <li className="text-xs text-slate-400 flex items-center gap-1.5">
                        <X className="w-3 h-3 text-red-400" />
                        {license.limitations.engine} engine only
                      </li>
                    </ul>
                  </div>
                )}

                {/* Licensed Features */}
                {isLicensed && license?.features && license.features.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-green-400 mb-2">Full Access Includes:</div>
                    <ul className="space-y-1">
                      {license.features.slice(0, 5).map((feature, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                      {license.features.length > 5 && (
                        <li className="text-xs text-slate-500">
                          +{license.features.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Activation Form (show if trial) */}
              {isTrial && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="text-sm text-amber-300 font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Free Trial Active - Upgrade to Pro
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      StemSplit is free to download and use in trial mode. Upgrade to remove trial limits and unlock full-quality, full-engine separation.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href="https://gumroad.com/l/stemsplit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400"
                      >
                        Buy StemSplit Pro
                      </a>
                      <a
                        href="https://gumroad.com/library"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-400"
                      >
                        Find My Gumroad License Key
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Flow: use trial now, purchase when ready, then paste your Gumroad email and license key below to unlock Pro instantly.
                    </p>
                  </div>

                  <div className="text-sm text-slate-300 font-medium">Activate Pro License</div>
                  <p className="text-xs text-slate-500">
                    Enter your Gumroad purchase email and license key to switch from Trial to Pro
                  </p>
                  
                  <input
                    type="email"
                    placeholder="Email used on Gumroad"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg 
                             text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <input
                    type="text"
                    placeholder="License key from Gumroad"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg 
                             text-slate-200 placeholder-slate-500 font-mono focus:outline-none 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 
                             disabled:text-slate-500 text-white text-sm font-medium rounded-lg 
                             transition-colors flex items-center justify-center gap-2"
                  >
                    {isActivating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying with Gumroad...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Activate License
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Deactivate button (show if licensed) */}
              {isLicensed && (
                <div className="space-y-2">
                  <button
                    onClick={handleDeactivate}
                    disabled={isActivating || loading}
                    className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 
                             text-sm rounded-lg transition-colors"
                  >
                    Deactivate License
                  </button>
                  <button
                    onClick={handleTestSecurityWebhook}
                    disabled={isTestingWebhook || loading}
                    className="w-full py-2 px-4 bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-700 
                             disabled:text-slate-500 text-white text-sm rounded-lg transition-colors"
                  >
                    {isTestingWebhook ? 'Testing Security Alerts...' : 'Test Security Alerts'}
                  </button>
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-green-300">{success}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-800/30 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Buy StemSplit on{' '}
                <a 
                  href="https://gumroad.com/l/stemsplit" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  Gumroad
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
