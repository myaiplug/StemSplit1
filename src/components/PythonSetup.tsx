'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, XCircle, Loader2, AlertCircle, Cpu, Zap } from 'lucide-react';
import {
  checkPythonStatus,
  setupPythonEnvironment,
  getSystemProfile,
  PythonStatus,
  PythonSetupProgress,
  SystemProfile,
} from '@/lib/tauri-bridge';

interface PythonSetupProps {
  onReady: () => void;
}

export default function PythonSetup({ onReady }: PythonSetupProps) {
  const [status, setStatus] = useState<PythonStatus | null>(null);
  const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<PythonSetupProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const result = await checkPythonStatus();
      setStatus(result);
      
      // If everything is ready, notify parent
      if (result.installed && result.packages_installed) {
        onReady();
      }
    } catch (err) {
      setError('Failed to check Python status');
    } finally {
      setIsChecking(false);
    }
  }, [onReady]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const profile = await getSystemProfile();
        if (isMounted) {
          setSystemProfile(profile);
        }
      } catch {
        if (isMounted) {
          setSystemProfile(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);
    setProgress({ message: 'Starting...', percent: 0 });

    try {
      await setupPythonEnvironment((prog) => {
        setProgress(prog);
      });
      
      // Re-check status after install
      await checkStatus();
    } catch (err: any) {
      setError(err?.message || 'Installation failed');
      setIsInstalling(false);
    }
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <h2 className="text-xl font-semibold text-white">Checking System...</h2>
          </div>
          <p className="text-zinc-400">Verifying AI components are installed</p>
        </motion.div>
      </div>
    );
  }

  // If Python is ready, don't show anything
  if (status?.installed && status?.packages_installed) {
    return null;
  }

  const installPlan = getInstallPlan(systemProfile);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-xl w-full mx-4 shadow-2xl shadow-black/40"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Download className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Setup Required</h2>
            <p className="text-zinc-400 text-sm">AI components need to be downloaded</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
            <div className="flex items-center gap-2 mb-2 text-zinc-200">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Detected System</span>
            </div>
            <p className="text-sm text-zinc-300">
              {systemProfile ? `${systemProfile.os} / ${systemProfile.arch}` : 'Scanning hardware profile...'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {systemProfile?.has_nvidia
                ? 'NVIDIA acceleration available'
                : systemProfile?.has_apple_silicon
                  ? 'Apple Silicon acceleration available'
                  : 'CPU-compatible runtime selected'}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
            <div className="flex items-center gap-2 mb-2 text-zinc-200">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">Recommended Payload</span>
            </div>
            <p className="text-sm text-zinc-300 break-all">
              {installPlan.payload}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {installPlan.runtimeLabel}
            </p>
          </div>
        </div>

        {/* Status Items */}
        <div className="space-y-3 mb-6">
          <StatusItem 
            label="Python Environment" 
            installed={status?.installed ?? false}
            detail={status?.version}
          />
          <StatusItem 
            label="PyTorch (AI Engine)" 
            installed={(status?.packages_installed && !status?.missing_packages.includes('torch')) ?? false}
          />
          <StatusItem 
            label="Demucs (Stem Separation)" 
            installed={(status?.packages_installed && !status?.missing_packages.includes('demucs')) ?? false}
          />
          <StatusItem 
            label="Audio Libraries" 
            installed={(status?.packages_installed && !status?.missing_packages.includes('librosa')) ?? false}
          />
        </div>

        {/* Progress Bar */}
        {isInstalling && progress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">{progress.message}</span>
              <span className="text-blue-400">{progress.percent}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 border border-zinc-700/80">
          <p className="text-zinc-300 text-sm">
            <strong>Estimated Footprint:</strong> {installPlan.estimatedSize}
          </p>
          <p className="text-zinc-400 text-sm mt-1">
            {installPlan.description}
          </p>
          <p className="text-zinc-500 text-xs mt-2">
            The backend now selects the safest runtime for this machine before installing PyTorch and the stem models.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-xl transition-colors"
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download & Install
              </>
            )}
          </button>
        </div>

        <p className="text-zinc-500 text-xs text-center mt-4">
          This only needs to be done once. Your internet connection is required.
        </p>
      </motion.div>
    </div>
  );
}

function getInstallPlan(systemProfile: SystemProfile | null): {
  payload: string;
  runtimeLabel: string;
  estimatedSize: string;
  description: string;
} {
  if (!systemProfile) {
    return {
      payload: 'Detecting optimal runtime...',
      runtimeLabel: 'System scan in progress',
      estimatedSize: 'Varies by hardware',
      description: 'StemSplit is profiling the machine so it can avoid shipping the wrong PyTorch runtime.',
    };
  }

  switch (systemProfile.recommended_payload) {
    case 'python_env_win_cuda.zip':
      return {
        payload: systemProfile.recommended_payload,
        runtimeLabel: 'Windows + NVIDIA CUDA runtime',
        estimatedSize: '~2.7 GB',
        description: 'Installs the CUDA-enabled PyTorch stack for the fastest Windows separation path.',
      };
    case 'python_env_win_cpu.zip':
      return {
        payload: systemProfile.recommended_payload,
        runtimeLabel: 'Windows CPU-safe runtime',
        estimatedSize: '~1.6 GB',
        description: 'Avoids CUDA baggage on non-NVIDIA systems and keeps the install materially smaller.',
      };
    case 'python_env_mac_arm64.zip':
      return {
        payload: systemProfile.recommended_payload,
        runtimeLabel: 'macOS Apple Silicon runtime',
        estimatedSize: '~1.9 GB',
        description: 'Targets Apple Silicon with the Metal-compatible PyTorch path for better performance per watt.',
      };
    case 'python_env_mac_x64.zip':
      return {
        payload: systemProfile.recommended_payload,
        runtimeLabel: 'macOS Intel runtime',
        estimatedSize: '~2.1 GB',
        description: 'Builds the Intel macOS environment without downloading GPU runtimes that cannot be used.',
      };
    default:
      return {
        payload: systemProfile.recommended_payload,
        runtimeLabel: 'Cross-platform fallback runtime',
        estimatedSize: '~1.8 GB',
        description: 'Uses the generic Python environment path when a more specific hardware target is unavailable.',
      };
  }
}

function StatusItem({ 
  label, 
  installed, 
  detail 
}: { 
  label: string; 
  installed: boolean;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
      <span className="text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-zinc-500 text-sm">{detail}</span>}
        {installed ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-zinc-500" />
        )}
      </div>
    </div>
  );
}
