/**
 * IPC Bridge - Frontend-to-Backend Communication Layer
 * Handles all async invocations to Rust backend commands
 */

import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

/**
 * Progress event received from backend
 */
export interface ProgressEvent {
  step: number;
  total_steps: number;
  message: string;
  progress_percent: number;
  timestamp: string;
}

/**
 * Separation result from backend
 */
export interface SeparationResult {
  status: string;
  output_directory: string;
  stems: Record<string, StemInfo>;
  process_duration_seconds: number;
  errors: string[];
  remediation?: SupportAssetRemediation | null;
}

export interface StemInfo {
  file_path: string;
  format: string;
  duration_seconds: number;
  purity_score?: number;
}

export interface SupportAssetRemediation {
  kind: 'support_asset';
  asset_name: string;
  download_url: string;
  relative_destination: string;
  checksum?: string | null;
  message: string;
}

export interface SeparationFailureManifest {
  status: string;
  output_directory: string;
  errors: string[];
  remediation?: SupportAssetRemediation | null;
}

export interface SupportAssetInstallResult {
  asset_name: string;
  installed_to: string;
}

export class SeparationFailureError extends Error {
  manifest: SeparationFailureManifest;

  constructor(manifest: SeparationFailureManifest) {
    super(manifest.errors?.[0] || manifest.remediation?.message || 'Separation failed');
    this.name = 'SeparationFailureError';
    this.manifest = manifest;
  }
}

function parseSeparationFailure(error: unknown): SeparationFailureManifest | null {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error);

  const jsonStart = rawMessage.indexOf('{');
  const jsonEnd = rawMessage.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMessage.slice(jsonStart, jsonEnd + 1)) as SeparationFailureManifest;
    if (parsed && Array.isArray(parsed.errors)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Request parameters for stem splitting
 */
export interface StemSplitRequest {
  file_path: string;
  output_dir?: string;
  output_format?: 'wav' | 'mp3';
  mp3_bitrate?: number;
  apply_effects?: boolean;
  pre_split_fx?: string;
  engine?: string;
  stems_count?: number;
  passes?: number;
}

/**
 * Start the stem split process on the backend
 * @param filePath Path to the audio file
 * @param options Optional parameters for stem splitting
 * @returns Promise with separation result
 */
export async function startStemSplit(
  filePath: string,
  options?: {
    outputDir?: string;
    format?: 'wav' | 'mp3';
    bitrate?: number;
    applyEffects?: boolean;
    preSplitFx?: string; 
    engine?: string;
    stems?: number;
    passes?: number;
  }
): Promise<SeparationResult> {
  try {
    console.log(`[IPC] Invoking execute_splice for: ${filePath}`, options);
    const result = await invoke<SeparationResult>('execute_splice', {
      request: {
        file_path: filePath,
        output_dir: options?.outputDir,
        output_format: options?.format || 'wav',
        mp3_bitrate: options?.bitrate || 320,
        apply_effects: options?.applyEffects !== false,
        pre_split_fx: options?.preSplitFx,
        engine: options?.engine,
        stems_count: options?.stems,
        passes: options?.passes,
      },
    });
    console.log('[IPC] Separation completed:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Error in execute_splice:', error);
    const manifest = parseSeparationFailure(error);
    if (manifest) {
      throw new SeparationFailureError(manifest);
    }
    throw error;
  }
}

/**
 * Cancel the active stem split process
 * @returns Promise with cancellation message
 */
export async function cancelStemSplit(): Promise<string> {
  try {
    console.log('[IPC] Invoking cancel_stem_split');
    const result = await invoke<string>('cancel_stem_split');
    console.log('[IPC] Cancellation successful:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Error in cancel_stem_split:', error);
    throw error;
  }
}

/**
 * Get the current status of the separator
 * @returns Promise with status string
 */
export async function getSeparatorStatus(): Promise<string> {
  try {
    const status = await invoke<string>('get_separator_status');
    return status;
  } catch (error) {
    console.error('[IPC] Error getting separator status:', error);
    throw error;
  }
}

/**
 * Perform a health check on the backend
 * @returns Promise with health status
 */
export async function healthCheck(): Promise<string> {
  try {
    const response = await invoke<string>('health_check');
    return response;
  } catch (error) {
    console.error('[IPC] Health check failed:', error);
    throw error;
  }
}

/**
 * Listen for progress updates from backend
 * @param callback Function to call when progress event is received
 * @returns Unlisten function
 */
export async function onStemSplitProgress(
  callback: (event: ProgressEvent) => void
): Promise<() => void> {
  return await listen<ProgressEvent>('stem-split-progress', (event) => {
    console.log('[IPC] Progress update:', event.payload);
    callback(event.payload);
  });
}

/**
 * Hook-style progress listener for React components
 */
export function useStemSplitProgress(
  callback: (event: ProgressEvent) => void
): void {
  React.useEffect(() => {
    let unlisten: (() => void) | null = null;

    (async () => {
      unlisten = await onStemSplitProgress(callback);
    })();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [callback]);
}

/**
 * Complete separation workflow with error handling
 */
export async function separateAudio(
  filePath: string,
  outputDir?: string,
  onProgress?: (event: ProgressEvent) => void
): Promise<SeparationResult> {
  try {
    // Set up progress listener if callback provided
    let unlistenProgress: (() => void) | null = null;
    if (onProgress) {
      unlistenProgress = await onStemSplitProgress(onProgress);
    }

    // Start separation with options
    const result = await startStemSplit(filePath, outputDir ? { outputDir } : undefined);

    // Clean up listener
    if (unlistenProgress) {
      unlistenProgress();
    }

    return result;
  } catch (error) {
    console.error('[IPC] Separation workflow failed:', error);
    throw error;
  }
}

/**
 * Safe cancellation with status check
 */
export async function safeCancelStemSplit(): Promise<boolean> {
  try {
    const status = await getSeparatorStatus();
    if (status === 'processing') {
      await cancelStemSplit();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[IPC] Safe cancellation failed:', error);
    return false;
  }
}

/**
 * Open the results folder in the system file explorer
 * @param path Full absolute path to folder
 */
export async function openResultsFolder(path: string): Promise<void> {
  try {
    console.log(`[IPC] Invoking open_results_folder: ${path}`);
    await invoke('open_results_folder', { path });
  } catch (error) {
    console.error('[IPC] Failed to open results folder:', error);
    throw error;
  }
}

// ============================================================================
// Python Environment Management
// ============================================================================

export interface PythonStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
  packages_installed: boolean;
  missing_packages: string[];
}

export interface PythonSetupProgress {
  message: string;
  percent: number;
}

export interface SystemProfile {
  os: string;
  arch: string;
  has_nvidia: boolean;
  has_apple_silicon: boolean;
  recommended_payload: string;
}

export interface DownloadProgress {
  url: string;
  downloaded: number;
  total: number;
  percentage: number;
}

/**
 * Check if Python environment is ready for stem splitting
 */
export async function checkPythonStatus(): Promise<PythonStatus> {
  try {
    console.log('[IPC] Checking Python status...');
    const result = await invoke<PythonStatus>('check_python_status');
    console.log('[IPC] Python status:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Failed to check Python status:', error);
    return {
      installed: false,
      path: null,
      version: null,
      packages_installed: false,
      missing_packages: ['torch', 'demucs', 'librosa'],
    };
  }
}

/**
 * Download and setup Python environment
 * @param onProgress Callback for progress updates
 */
export async function setupPythonEnvironment(
  onProgress?: (progress: PythonSetupProgress) => void
): Promise<string> {
  try {
    console.log('[IPC] Starting Python environment setup...');
    
    // Set up progress listener
    let unlisten: (() => void) | null = null;
    if (onProgress) {
      unlisten = await listen<PythonSetupProgress>('python-setup-progress', (event) => {
        onProgress(event.payload);
      });
    }
    
    const result = await invoke<string>('setup_python_environment');
    
    if (unlisten) unlisten();
    
    console.log('[IPC] Python setup complete:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Python setup failed:', error);
    throw error;
  }
}

/**
 * Listen for Python setup progress events
 */
export async function onPythonSetupProgress(
  callback: (progress: PythonSetupProgress) => void
): Promise<() => void> {
  return await listen<PythonSetupProgress>('python-setup-progress', (event) => {
    callback(event.payload);
  });
}

export async function getSystemProfile(): Promise<SystemProfile> {
  try {
    return await invoke<SystemProfile>('get_system_profile');
  } catch (error) {
    console.error('[IPC] Failed to get system profile:', error);
    throw error;
  }
}

export async function downloadFile(
  url: string,
  destination: string,
  checksum?: string
): Promise<string> {
  try {
    return await invoke<string>('download_file', { url, destination, checksum });
  } catch (error) {
    console.error('[IPC] Download failed:', error);
    throw error;
  }
}

export async function installSupportAsset(
  remediation: SupportAssetRemediation,
  onProgress?: (progress: DownloadProgress) => void
): Promise<SupportAssetInstallResult> {
  let unlisten: (() => void) | null = null;

  try {
    if (onProgress) {
      unlisten = await listen<DownloadProgress>('support-asset-download-progress', (event) => {
        onProgress(event.payload);
      });
    }

    return await invoke<SupportAssetInstallResult>('install_support_asset', {
      request: {
        asset_name: remediation.asset_name,
        download_url: remediation.download_url,
        relative_destination: remediation.relative_destination,
        checksum: remediation.checksum ?? null,
      },
    });
  } catch (error) {
    console.error('[IPC] Support asset install failed:', error);
    throw error;
  } finally {
    if (unlisten) {
      unlisten();
    }
  }
}

export async function onDownloadProgress(
  callback: (progress: DownloadProgress) => void
): Promise<() => void> {
  return await listen<DownloadProgress>('download-progress', (event) => {
    callback(event.payload);
  });
}

// ============================================================================
// License System
// ============================================================================

/**
 * Trial limitations for free tier
 */
export interface TrialLimitations {
  max_duration_seconds: number;   // 180 = 3 minutes max
  allowed_stems: string[];        // ["vocals", "instrumental"]
  output_format: string;          // "mp3" only for trial
  engine: string;                 // "spleeter" for trial
  batch_allowed: boolean;
  fx_allowed: boolean;
  vst_allowed: boolean;
  high_quality_preview: boolean;
}

/**
 * License information returned from backend
 */
export interface LicenseInfo {
  is_valid: boolean;
  is_trial: boolean;
  email: string | null;
  purchase_date: string | null;
  license_key: string | null;    // Masked for display
  features: string[];
  limitations: TrialLimitations;
  error: string | null;
}

export interface TrialCooldownStatus {
  is_trial: boolean;
  completed_splits: number;
  cooldown_active: boolean;
  remaining_seconds: number;
  current_cooldown_minutes: number;
  next_cooldown_minutes: number;
}

export interface SecurityWebhookDispatchResult {
  success: boolean;
  queued_for_retry: boolean;
  message: string;
}

/**
 * Get current license status
 */
export async function getLicenseStatus(): Promise<LicenseInfo> {
  try {
    console.log('[IPC] Getting license status...');
    const result = await invoke<LicenseInfo>('get_license_status');
    console.log('[IPC] License status:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Error getting license status:', error);
    // Return trial tier as fallback
    return {
      is_valid: false,
      is_trial: true,
      email: null,
      purchase_date: null,
      license_key: null,
      features: ['2-stem separation (vocals + instrumental)', 'Files under 3 minutes', 'MP3 output only', 'Spleeter engine only'],
      limitations: {
        max_duration_seconds: 180,
        allowed_stems: ['vocals', 'instrumental'],
        output_format: 'mp3',
        engine: 'spleeter',
        batch_allowed: false,
        fx_allowed: false,
        vst_allowed: false,
        high_quality_preview: true,
      },
      error: String(error),
    };
  }
}

/**
 * Activate a license key with email verification
 */
export async function activateLicense(licenseKey: string, email: string): Promise<LicenseInfo> {
  try {
    console.log('[IPC] Activating license...');
    const result = await invoke<LicenseInfo>('activate_license', { licenseKey, email });
    console.log('[IPC] License activation result:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Error activating license:', error);
    return {
      is_valid: false,
      is_trial: true,
      email: email,
      purchase_date: null,
      license_key: null,
      features: ['2-stem separation (vocals + instrumental)', 'Files under 3 minutes', 'MP3 output only', 'Spleeter engine only'],
      limitations: {
        max_duration_seconds: 180,
        allowed_stems: ['vocals', 'instrumental'],
        output_format: 'mp3',
        engine: 'spleeter',
        batch_allowed: false,
        fx_allowed: false,
        vst_allowed: false,
        high_quality_preview: true,
      },
      error: String(error),
    };
  }
}

/**
 * Deactivate current license (return to trial)
 */
export async function deactivateLicense(): Promise<LicenseInfo> {
  try {
    console.log('[IPC] Deactivating license...');
    const result = await invoke<LicenseInfo>('deactivate_license');
    console.log('[IPC] License deactivated:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Error deactivating license:', error);
    return {
      is_valid: false,
      is_trial: true,
      email: null,
      purchase_date: null,
      license_key: null,
      features: ['2-stem separation (vocals + instrumental)', 'Files under 3 minutes', 'MP3 output only', 'Spleeter engine only'],
      limitations: {
        max_duration_seconds: 180,
        allowed_stems: ['vocals', 'instrumental'],
        output_format: 'mp3',
        engine: 'spleeter',
        batch_allowed: false,
        fx_allowed: false,
        vst_allowed: false,
        high_quality_preview: true,
      },
      error: String(error),
    };
  }
}

export async function getTrialCooldownStatus(): Promise<TrialCooldownStatus> {
  try {
    return await invoke<TrialCooldownStatus>('get_trial_cooldown_status');
  } catch (error) {
    console.error('[IPC] Failed to fetch trial cooldown status:', error);
    return {
      is_trial: true,
      completed_splits: 0,
      cooldown_active: false,
      remaining_seconds: 0,
      current_cooldown_minutes: 0,
      next_cooldown_minutes: 15,
    };
  }
}

export async function testSecurityWebhook(): Promise<SecurityWebhookDispatchResult> {
  try {
    return await invoke<SecurityWebhookDispatchResult>('test_security_webhook');
  } catch (error) {
    return {
      success: false,
      queued_for_retry: false,
      message: String(error),
    };
  }
}

/**
 * Check if current license includes a specific feature
 */
export function hasFeature(license: LicenseInfo, feature: string): boolean {
  return license.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
}

/**
 * Check if license is full/paid (not trial)
 */
export function isPro(license: LicenseInfo): boolean {
  return license.is_valid && !license.is_trial;
}

/**
 * Check if license is trial/free
 */
export function isTrial(license: LicenseInfo): boolean {
  return license.is_trial;
}

/**
 * For backwards compatibility - enterprise is same as pro now (single paid tier)
 */
export function isEnterprise(license: LicenseInfo): boolean {
  return license.is_valid && !license.is_trial;
}
