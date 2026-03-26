// Tauri Backend - Stem Split Application
// Professional stem separation with progress tracking and event emission

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod hardware;
mod downloader;

use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Read, Write};
use std::sync::{Arc, Mutex};
use std::path::{Path, PathBuf};
use tauri::Manager;
use tokio::time::{sleep, Duration};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_MAX_INPUT_MB: u64 = 500;
const MALICIOUS_UPLOAD_HOLD_HOURS: i64 = 72;
const SECURITY_WEBHOOK_RETRY_ATTEMPTS: usize = 3;
const SECURITY_WEBHOOK_RETRY_DELAY_MS: u64 = 900;

// ============================================================================
// Gumroad License System
// ============================================================================

// Your Gumroad product permalink/ID
const GUMROAD_PRODUCT_ID: &str = "stemsplit";

// How often to re-verify license online (in seconds) - 7 days
const LICENSE_RECHECK_INTERVAL: i64 = 7 * 24 * 60 * 60;

fn get_dev_bypass_key() -> Option<String> {
    // Developer bypass is debug-only and must come from an explicit environment variable.
    #[cfg(debug_assertions)]
    {
        std::env::var("STEMSPLIT_DEV_BYPASS_KEY")
            .ok()
            .filter(|key| !key.trim().is_empty())
    }

    #[cfg(not(debug_assertions))]
    {
        None
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct LicenseInfo {
    pub is_valid: bool,
    pub is_trial: bool,
    pub email: Option<String>,
    pub purchase_date: Option<String>,
    pub license_key: Option<String>,
    pub features: Vec<String>,
    pub limitations: TrialLimitations,
    pub error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct SupportAssetRequest {
    asset_name: String,
    download_url: String,
    relative_destination: String,
    checksum: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct SupportAssetInstallResult {
    asset_name: String,
    installed_to: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct TrialLimitations {
    pub max_duration_seconds: u32,      // 180 = 3 minutes
    pub allowed_stems: Vec<String>,     // ["vocals", "instrumental"]
    pub output_format: String,          // "mp3" only for trial
    pub engine: String,                 // "spleeter" for trial
    pub batch_allowed: bool,            // false for trial
    pub fx_allowed: bool,               // false for trial
    pub vst_allowed: bool,              // false for trial
    pub high_quality_preview: bool,     // true - show them what they're missing
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct StoredLicense {
    license_key: String,
    email: String,
    activated_at: String,
    last_verified: i64,  // Unix timestamp of last online verification
    is_valid: bool,
}

#[derive(Clone, Serialize, Deserialize, Debug, Default)]
struct TrialUsage {
    completed_splits: u32,
    last_completed_unix: i64,
}

#[derive(Clone, Serialize, Deserialize, Debug, Default)]
struct SecurityHold {
    blocked_until_unix: i64,
    flagged_at_unix: i64,
    malicious_attempts: u32,
    permanently_banned: bool,
    reason: String,
}

#[derive(Clone, Debug)]
struct ValidationFailure {
    message: String,
    malicious: bool,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct SecurityIncidentReport {
    event: String,
    timestamp_utc: String,
    local_username: String,
    machine_name: String,
    license_email: Option<String>,
    attempted_file_path: String,
    reason: String,
    malicious_attempts: u32,
    blocked_until_unix: i64,
    permanently_banned: bool,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct SecurityWebhookDispatchResult {
    success: bool,
    queued_for_retry: bool,
    message: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct TrialCooldownStatus {
    is_trial: bool,
    completed_splits: u32,
    cooldown_active: bool,
    remaining_seconds: i64,
    current_cooldown_minutes: i64,
    next_cooldown_minutes: i64,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct GumroadVerifyResponse {
    success: bool,
    uses: Option<i32>,
    purchase: Option<GumroadPurchase>,
    message: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GumroadPurchase {
    email: Option<String>,
    created_at: Option<String>,
    refunded: Option<bool>,
    chargebacked: Option<bool>,
}

/// Get the license file path in app data directory
fn get_license_path() -> std::path::PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("StemSplit");
    
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("license.json")
}

fn get_trial_usage_path() -> std::path::PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("StemSplit");

    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("trial_usage.json")
}

fn get_security_hold_path() -> std::path::PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("StemSplit");

    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("security_hold.json")
}

fn get_security_incident_queue_path() -> std::path::PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("StemSplit");

    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("security_incident_queue.jsonl")
}

fn trial_cooldown_minutes_for_split_count(completed_splits: u32) -> i64 {
    const COOLDOWN_SCHEDULE_MINUTES: [i64; 7] = [15, 20, 30, 35, 40, 45, 50];

    if completed_splits == 0 {
        return 0;
    }

    let idx = std::cmp::min((completed_splits - 1) as usize, COOLDOWN_SCHEDULE_MINUTES.len() - 1);
    COOLDOWN_SCHEDULE_MINUTES[idx]
}

fn load_trial_usage() -> TrialUsage {
    let usage_path = get_trial_usage_path();
    if !usage_path.exists() {
        return TrialUsage::default();
    }

    std::fs::read_to_string(&usage_path)
        .ok()
        .and_then(|content| serde_json::from_str::<TrialUsage>(&content).ok())
        .unwrap_or_default()
}

fn save_trial_usage(usage: &TrialUsage) {
    let usage_path = get_trial_usage_path();
    if let Ok(content) = serde_json::to_string_pretty(usage) {
        let _ = std::fs::write(usage_path, content);
    }
}

fn enforce_trial_cooldown() -> Result<(), String> {
    let usage = load_trial_usage();
    let cooldown_minutes = trial_cooldown_minutes_for_split_count(usage.completed_splits);
    if cooldown_minutes <= 0 || usage.last_completed_unix <= 0 {
        return Ok(());
    }

    let now = chrono::Utc::now().timestamp();
    let elapsed_seconds = now.saturating_sub(usage.last_completed_unix);
    let required_seconds = cooldown_minutes * 60;

    if elapsed_seconds >= required_seconds {
        return Ok(());
    }

    let remaining = required_seconds - elapsed_seconds;
    let remaining_minutes = (remaining + 59) / 60;
    Err(format!(
        "Trial cooldown active. Please wait {} minute(s) before the next split. Upgrade on Gumroad for instant, unlimited processing: https://gumroad.com/l/stemsplit",
        remaining_minutes
    ))
}

fn register_trial_split_completion() {
    let mut usage = load_trial_usage();
    usage.completed_splits = usage.completed_splits.saturating_add(1);
    usage.last_completed_unix = chrono::Utc::now().timestamp();
    save_trial_usage(&usage);
}

fn load_security_hold() -> SecurityHold {
    let hold_path = get_security_hold_path();
    if !hold_path.exists() {
        return SecurityHold::default();
    }

    std::fs::read_to_string(&hold_path)
        .ok()
        .and_then(|content| serde_json::from_str::<SecurityHold>(&content).ok())
        .unwrap_or_default()
}

fn save_security_hold(hold: &SecurityHold) {
    let hold_path = get_security_hold_path();
    if let Ok(content) = serde_json::to_string_pretty(hold) {
        let _ = std::fs::write(hold_path, content);
    }
}

fn security_reopen_unix(hold: &SecurityHold) -> i64 {
    if hold.permanently_banned {
        return i64::MAX;
    }

    if hold.blocked_until_unix <= 0 || hold.flagged_at_unix <= 0 {
        return 0;
    }

    let penalty = hold.blocked_until_unix.saturating_sub(hold.flagged_at_unix);
    hold.flagged_at_unix.saturating_add(penalty / 2)
}

fn should_hide_window_for_security(hold: &SecurityHold, now_unix: i64) -> bool {
    let reopen_unix = security_reopen_unix(hold);
    if reopen_unix <= 0 {
        return false;
    }
    now_unix < reopen_unix
}

fn enforce_window_security_policy(app: &tauri::AppHandle) {
    let hold = load_security_hold();
    let now = chrono::Utc::now().timestamp();
    if !should_hide_window_for_security(&hold, now) {
        return;
    }

    if let Some(window) = app.get_window("main") {
        let _ = window.set_skip_taskbar(true);
        let _ = window.hide();
    }
}

fn enforce_security_hold_if_active() -> Result<(), String> {
    let hold = load_security_hold();
    if hold.permanently_banned {
        return Err(format!(
            "Security ban active pending manual review. Reason: {}",
            if hold.reason.is_empty() { "repeated suspicious uploads detected" } else { &hold.reason }
        ));
    }

    if hold.blocked_until_unix <= 0 {
        return Ok(());
    }

    let now = chrono::Utc::now().timestamp();
    if now >= hold.blocked_until_unix {
        return Ok(());
    }

    let remaining_seconds = hold.blocked_until_unix - now;
    let remaining_hours = (remaining_seconds + 3599) / 3600;
    Err(format!(
        "Security hold active for {} more hour(s) pending review. Reason: {}",
        remaining_hours,
        if hold.reason.is_empty() { "suspicious upload detected" } else { &hold.reason }
    ))
}

fn register_malicious_attempt(reason: &str) -> (String, SecurityHold) {
    let mut hold = load_security_hold();
    let now = chrono::Utc::now().timestamp();
    hold.malicious_attempts = hold.malicious_attempts.saturating_add(1);
    hold.flagged_at_unix = now;
    hold.reason = reason.to_string();

    let message = if hold.malicious_attempts >= 3 {
        hold.permanently_banned = true;
        hold.blocked_until_unix = i64::MAX;
        "Security policy violation: third suspicious upload detected. Access permanently banned pending manual review.".to_string()
    } else if hold.malicious_attempts == 2 {
        hold.permanently_banned = false;
        hold.blocked_until_unix = now + (MALICIOUS_UPLOAD_HOLD_HOURS * 60 * 60);
        "Security policy violation: second suspicious upload detected. A 72-hour security hold has been activated pending review.".to_string()
    } else {
        hold.permanently_banned = false;
        hold.blocked_until_unix = 0;
        "Suspicious upload detected and logged. One more malicious attempt will trigger a 72-hour lock pending review.".to_string()
    };

    save_security_hold(&hold);
    (format!("{} Reason: {}", message, reason), hold)
}

fn get_local_username() -> String {
    std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "unknown".to_string())
}

fn get_machine_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown-host".to_string())
}

fn get_stored_license_email() -> Option<String> {
    let license_path = get_license_path();
    std::fs::read_to_string(license_path)
        .ok()
        .and_then(|content| serde_json::from_str::<StoredLicense>(&content).ok())
        .map(|stored| stored.email)
}

async fn send_security_incident_report(report: &SecurityIncidentReport) {
    let _ = deliver_security_incident_report(report, true).await;
}

fn get_security_webhook_secret() -> Option<String> {
    std::env::var("STEMSPLIT_SECURITY_WEBHOOK_SECRET")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn build_security_webhook_signature(secret: &str, payload: &str) -> Result<String, String> {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|e| format!("failed to initialize webhook signature: {}", e))?;
    mac.update(payload.as_bytes());
    let bytes = mac.finalize().into_bytes();

    let mut hex = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        hex.push_str(&format!("{:02x}", byte));
    }
    Ok(hex)
}

fn queue_security_incident_report(report: &SecurityIncidentReport) -> bool {
    let queue_path = get_security_incident_queue_path();
    let serialized = match serde_json::to_string(report) {
        Ok(value) => value,
        Err(_) => return false,
    };

    let mut file = match std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(queue_path)
    {
        Ok(file) => file,
        Err(_) => return false,
    };

    writeln!(file, "{}", serialized).is_ok()
}

async fn post_security_incident_report(
    client: &reqwest::Client,
    webhook_url: &str,
    report: &SecurityIncidentReport,
    payload: &str,
    signature: Option<&str>,
) -> Result<(), String> {
    let mut request = client
        .post(webhook_url)
        .header("Content-Type", "application/json")
        .header("X-StemSplit-Event", &report.event)
        .header("X-StemSplit-Timestamp", &report.timestamp_utc);

    if let Some(signature) = signature {
        request = request
            .header("X-StemSplit-Signature", signature)
            .header("X-StemSplit-Signature-Alg", "hmac-sha256");
    }

    let response = request
        .body(payload.to_string())
        .send()
        .await
        .map_err(|e| format!("webhook request failed: {}", e))?;

    if response.status().is_success() {
        return Ok(());
    }

    Err(format!(
        "webhook returned non-success status: {}",
        response.status()
    ))
}

async fn deliver_security_incident_report(
    report: &SecurityIncidentReport,
    queue_on_failure: bool,
) -> SecurityWebhookDispatchResult {
    let webhook_url = match std::env::var("STEMSPLIT_SECURITY_WEBHOOK_URL") {
        Ok(url) if !url.trim().is_empty() => url,
        _ => {
            return SecurityWebhookDispatchResult {
                success: false,
                queued_for_retry: false,
                message: "STEMSPLIT_SECURITY_WEBHOOK_URL is not configured".to_string(),
            }
        }
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            return SecurityWebhookDispatchResult {
                success: false,
                queued_for_retry: false,
                message: format!("failed to initialize webhook HTTP client: {}", e),
            }
        }
    };

    let payload = match serde_json::to_string(report) {
        Ok(payload) => payload,
        Err(e) => {
            return SecurityWebhookDispatchResult {
                success: false,
                queued_for_retry: false,
                message: format!("failed to serialize security incident report: {}", e),
            }
        }
    };

    let signature = get_security_webhook_secret()
        .map(|secret| build_security_webhook_signature(&secret, &payload))
        .transpose()
        .map_err(|e| SecurityWebhookDispatchResult {
            success: false,
            queued_for_retry: false,
            message: e,
        });
    let signature = match signature {
        Ok(value) => value,
        Err(result) => return result,
    };

    let mut last_error = String::new();
    for attempt in 1..=SECURITY_WEBHOOK_RETRY_ATTEMPTS {
        match post_security_incident_report(&client, &webhook_url, report, &payload, signature.as_deref()).await {
            Ok(_) => {
                return SecurityWebhookDispatchResult {
                    success: true,
                    queued_for_retry: false,
                    message: format!("incident report delivered on attempt {}", attempt),
                }
            }
            Err(err) => {
                last_error = err;
                if attempt < SECURITY_WEBHOOK_RETRY_ATTEMPTS {
                    sleep(Duration::from_millis(SECURITY_WEBHOOK_RETRY_DELAY_MS)).await;
                }
            }
        }
    }

    if !queue_on_failure {
        return SecurityWebhookDispatchResult {
            success: false,
            queued_for_retry: false,
            message: format!(
                "webhook delivery failed after retries (not re-queued during flush). Last error: {}",
                last_error
            ),
        };
    }

    let queued = queue_security_incident_report(report);
    SecurityWebhookDispatchResult {
        success: false,
        queued_for_retry: queued,
        message: if queued {
            format!(
                "webhook delivery failed after retries; incident queued for retry. Last error: {}",
                last_error
            )
        } else {
            format!(
                "webhook delivery failed and queue write failed. Last error: {}",
                last_error
            )
        },
    }
}

async fn flush_queued_security_incidents() {
    let queue_path = get_security_incident_queue_path();
    if !queue_path.exists() {
        return;
    }

    let content = match std::fs::read_to_string(&queue_path) {
        Ok(content) => content,
        Err(_) => return,
    };

    let mut pending_reports: Vec<SecurityIncidentReport> = Vec::new();
    for line in content.lines().filter(|line| !line.trim().is_empty()) {
        if let Ok(report) = serde_json::from_str::<SecurityIncidentReport>(line) {
            pending_reports.push(report);
        }
    }

    if pending_reports.is_empty() {
        let _ = std::fs::remove_file(queue_path);
        return;
    }

    let mut failed_reports: Vec<SecurityIncidentReport> = Vec::new();
    for report in pending_reports {
        let result = deliver_security_incident_report(&report, false).await;
        if !result.success {
            failed_reports.push(report);
        }
    }

    if failed_reports.is_empty() {
        let _ = std::fs::remove_file(queue_path);
        return;
    }

    let mut rewrite = String::new();
    for report in failed_reports {
        if let Ok(serialized) = serde_json::to_string(&report) {
            rewrite.push_str(&serialized);
            rewrite.push('\n');
        }
    }
    let _ = std::fs::write(queue_path, rewrite);
}

fn max_input_file_bytes() -> u64 {
    let max_mb = std::env::var("STEMSPLIT_MAX_INPUT_MB")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_MAX_INPUT_MB);

    max_mb.saturating_mul(1024 * 1024)
}

fn is_likely_audio_signature(header: &[u8]) -> bool {
    if header.len() >= 12 && &header[0..4] == b"RIFF" && &header[8..12] == b"WAVE" {
        return true;
    }
    if header.starts_with(b"fLaC") {
        return true;
    }
    if header.starts_with(b"OggS") {
        return true;
    }
    if header.starts_with(b"ID3") {
        return true;
    }
    if header.len() >= 2 && header[0] == 0xFF && (header[1] & 0xE0) == 0xE0 {
        return true;
    }
    if header.len() >= 8 && &header[4..8] == b"ftyp" {
        return true;
    }

    false
}

fn validate_input_audio_file(file_path: &str) -> Result<(), ValidationFailure> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(ValidationFailure {
            message: format!("Input file not found: {}", file_path),
            malicious: false,
        });
    }

    let metadata = std::fs::metadata(path)
        .map_err(|e| ValidationFailure {
            message: format!("Unable to inspect input file metadata: {}", e),
            malicious: true,
        })?;
    if !metadata.is_file() {
        return Err(ValidationFailure {
            message: "Input must be a regular file".to_string(),
            malicious: true,
        });
    }

    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .unwrap_or_default();
    let allowed_extensions = ["wav", "mp3", "flac", "ogg", "m4a"];
    if !allowed_extensions.contains(&extension.as_str()) {
        return Err(ValidationFailure {
            message: "Unsupported input format. Allowed: wav, mp3, flac, ogg, m4a".to_string(),
            malicious: false,
        });
    }

    let size_bytes = metadata.len();
    if size_bytes == 0 {
        return Err(ValidationFailure {
            message: "Input file is empty".to_string(),
            malicious: false,
        });
    }

    let max_bytes = max_input_file_bytes();
    if size_bytes > max_bytes {
        let size_mb = size_bytes / (1024 * 1024);
        let max_mb = max_bytes / (1024 * 1024);
        return Err(ValidationFailure {
            message: format!(
                "Input file too large: {} MB (max allowed {} MB)",
                size_mb, max_mb
            ),
            malicious: false,
        });
    }

    let mut file = std::fs::File::open(path)
        .map_err(|e| ValidationFailure {
            message: format!("Unable to open input file for validation: {}", e),
            malicious: true,
        })?;
    let mut header = [0_u8; 16];
    let read = file
        .read(&mut header)
        .map_err(|e| ValidationFailure {
            message: format!("Unable to read input file header: {}", e),
            malicious: true,
        })?;

    if read < 4 || !is_likely_audio_signature(&header[..read]) {
        return Err(ValidationFailure {
            message: "Suspicious upload detected: file signature does not match a supported audio format".to_string(),
            malicious: true,
        });
    }

    Ok(())
}

#[tauri::command]
fn get_trial_cooldown_status() -> TrialCooldownStatus {
    let license = get_license_status();
    let usage = load_trial_usage();

    let current_cooldown_minutes = trial_cooldown_minutes_for_split_count(usage.completed_splits);
    let next_cooldown_minutes = trial_cooldown_minutes_for_split_count(usage.completed_splits.saturating_add(1));

    if !license.is_trial || current_cooldown_minutes <= 0 || usage.last_completed_unix <= 0 {
        return TrialCooldownStatus {
            is_trial: license.is_trial,
            completed_splits: usage.completed_splits,
            cooldown_active: false,
            remaining_seconds: 0,
            current_cooldown_minutes,
            next_cooldown_minutes,
        };
    }

    let now = chrono::Utc::now().timestamp();
    let elapsed_seconds = now.saturating_sub(usage.last_completed_unix);
    let required_seconds = current_cooldown_minutes * 60;
    let remaining_seconds = (required_seconds - elapsed_seconds).max(0);

    TrialCooldownStatus {
        is_trial: true,
        completed_splits: usage.completed_splits,
        cooldown_active: remaining_seconds > 0,
        remaining_seconds,
        current_cooldown_minutes,
        next_cooldown_minutes,
    }
}

#[tauri::command]
async fn test_security_webhook() -> Result<SecurityWebhookDispatchResult, String> {
    let report = SecurityIncidentReport {
        event: "security_webhook_test".to_string(),
        timestamp_utc: chrono::Utc::now().to_rfc3339(),
        local_username: get_local_username(),
        machine_name: get_machine_name(),
        license_email: get_stored_license_email(),
        attempted_file_path: "(manual-test)".to_string(),
        reason: "Manual webhook test triggered from StemSplit backend".to_string(),
        malicious_attempts: 0,
        blocked_until_unix: 0,
        permanently_banned: false,
    };

    let result = deliver_security_incident_report(&report, true).await;
    if result.success || result.queued_for_retry {
        Ok(result)
    } else {
        Err(result.message)
    }
}

/// Get trial limitations (free tier)
fn get_trial_limitations() -> TrialLimitations {
    TrialLimitations {
        max_duration_seconds: 180,  // 3 minutes max
        allowed_stems: vec!["vocals".into(), "instrumental".into()],  // 2-stem only
        output_format: "mp3".into(),  // MP3 only, no WAV
        engine: "spleeter".into(),    // Spleeter only (fastest, lower quality)
        batch_allowed: false,
        fx_allowed: false,
        vst_allowed: false,
        high_quality_preview: true,   // Let them hear the difference!
    }
}

/// Get full license features (paid tier)
fn get_full_features() -> Vec<String> {
    vec![
        "Unlimited audio duration".into(),
        "All stem types (vocals, drums, bass, other, piano, guitar)".into(),
        "High-quality WAV output".into(),
        "All AI engines (Demucs, MDX23, UVR, Drumsep)".into(),
        "Batch processing".into(),
        "Pro FX Rack".into(),
        "VST plugin hosting".into(),
        "6-stem separation".into(),
    ]
}

/// Get trial features
fn get_trial_features() -> Vec<String> {
    vec![
        "2-stem separation (vocals + instrumental)".into(),
        "Files under 3 minutes".into(),
        "MP3 output only".into(),
        "Spleeter engine only".into(),
        "Single file processing".into(),
    ]
}

/// No limitations for paid users
fn get_no_limitations() -> TrialLimitations {
    TrialLimitations {
        max_duration_seconds: 0,  // 0 = unlimited
        allowed_stems: vec![],    // empty = all allowed
        output_format: "any".into(),
        engine: "any".into(),
        batch_allowed: true,
        fx_allowed: true,
        vst_allowed: true,
        high_quality_preview: true,
    }
}

/// Verify license with Gumroad API
fn verify_with_gumroad(license_key: &str) -> Result<(bool, Option<String>, Option<String>), String> {
    let client = reqwest::blocking::Client::new();
    
    let response = client
        .post("https://api.gumroad.com/v2/licenses/verify")
        .form(&[
            ("product_id", GUMROAD_PRODUCT_ID),
            ("license_key", license_key),
            ("increment_uses_count", "false"),  // Don't increment on every check
        ])
        .send()
        .map_err(|e| format!("Network error: {}", e))?;
    
    let gumroad_response: GumroadVerifyResponse = response
        .json()
        .map_err(|e| format!("Invalid response: {}", e))?;
    
    if !gumroad_response.success {
        return Err(gumroad_response.message.unwrap_or("License verification failed".into()));
    }
    
    if let Some(purchase) = gumroad_response.purchase {
        // Check if refunded or chargebacked
        if purchase.refunded.unwrap_or(false) {
            return Err("This license has been refunded".into());
        }
        if purchase.chargebacked.unwrap_or(false) {
            return Err("This license has been chargebacked".into());
        }
        
        Ok((true, purchase.email, purchase.created_at))
    } else {
        Err("Invalid license key".into())
    }
}

#[tauri::command]
fn get_license_status() -> LicenseInfo {
    let license_path = get_license_path();
    
    // Check if license file exists
    if !license_path.exists() {
        return LicenseInfo {
            is_valid: false,
            is_trial: true,
            email: None,
            purchase_date: None,
            license_key: None,
            features: get_trial_features(),
            limitations: get_trial_limitations(),
            error: None,
        };
    }
    
    // Read stored license
    let stored: StoredLicense = match std::fs::read_to_string(&license_path) {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(license) => license,
            Err(_) => return LicenseInfo {
                is_valid: false,
                is_trial: true,
                email: None,
                purchase_date: None,
                license_key: None,
                features: get_trial_features(),
                limitations: get_trial_limitations(),
                error: Some("Failed to parse stored license".into()),
            },
        },
        Err(_) => return LicenseInfo {
            is_valid: false,
            is_trial: true,
            email: None,
            purchase_date: None,
            license_key: None,
            features: get_trial_features(),
            limitations: get_trial_limitations(),
            error: None,
        },
    };
    
    let now = chrono::Utc::now().timestamp();
    let needs_reverify = (now - stored.last_verified) > LICENSE_RECHECK_INTERVAL;
    
    // If we need to re-verify online
    if needs_reverify {
        match verify_with_gumroad(&stored.license_key) {
            Ok((valid, email, _)) => {
                if valid {
                    // Update last verified time
                    let updated = StoredLicense {
                        license_key: stored.license_key.clone(),
                        email: email.clone().unwrap_or(stored.email.clone()),
                        activated_at: stored.activated_at.clone(),
                        last_verified: now,
                        is_valid: true,
                    };
                    let _ = std::fs::write(&license_path, serde_json::to_string_pretty(&updated).unwrap());
                    
                    return LicenseInfo {
                        is_valid: true,
                        is_trial: false,
                        email: email.or(Some(stored.email)),
                        purchase_date: Some(stored.activated_at),
                        license_key: Some(mask_license_key(&stored.license_key)),
                        features: get_full_features(),
                        limitations: get_no_limitations(),
                        error: None,
                    };
                }
            }
            Err(e) => {
                // If offline, use cached result if still within grace period (30 days)
                let grace_period = 30 * 24 * 60 * 60;
                if (now - stored.last_verified) < grace_period && stored.is_valid {
                    return LicenseInfo {
                        is_valid: true,
                        is_trial: false,
                        email: Some(stored.email),
                        purchase_date: Some(stored.activated_at),
                        license_key: Some(mask_license_key(&stored.license_key)),
                        features: get_full_features(),
                        limitations: get_no_limitations(),
                        error: Some(format!("Offline mode - last verified {} days ago", (now - stored.last_verified) / 86400)),
                    };
                }
                
                // Grace period expired, revert to trial
                return LicenseInfo {
                    is_valid: false,
                    is_trial: true,
                    email: Some(stored.email),
                    purchase_date: None,
                    license_key: None,
                    features: get_trial_features(),
                    limitations: get_trial_limitations(),
                    error: Some(e),
                };
            }
        }
    }
    
    // Use cached valid license
    if stored.is_valid {
        return LicenseInfo {
            is_valid: true,
            is_trial: false,
            email: Some(stored.email),
            purchase_date: Some(stored.activated_at),
            license_key: Some(mask_license_key(&stored.license_key)),
            features: get_full_features(),
            limitations: get_no_limitations(),
            error: None,
        };
    }
    
    // Fallback to trial
    LicenseInfo {
        is_valid: false,
        is_trial: true,
        email: None,
        purchase_date: None,
        license_key: None,
        features: get_trial_features(),
        limitations: get_trial_limitations(),
        error: None,
    }
}

/// Mask license key for display (show only first and last 4 chars)
fn mask_license_key(key: &str) -> String {
    if key.len() <= 8 {
        return "****".into();
    }
    format!("{}...{}", &key[..4], &key[key.len()-4..])
}

#[tauri::command]
fn activate_license(license_key: String, email: String) -> LicenseInfo {
    // Normalize email for comparison
    let email_normalized = email.trim().to_lowercase();
    
    if email_normalized.is_empty() {
        return LicenseInfo {
            is_valid: false,
            is_trial: true,
            email: None,
            purchase_date: None,
            license_key: None,
            features: get_trial_features(),
            limitations: get_trial_limitations(),
            error: Some("Email address is required".into()),
        };
    }
    
    // Developer bypass is only available in debug builds when explicitly configured.
    if get_dev_bypass_key()
        .as_ref()
        .map(|bypass| bypass == &license_key)
        .unwrap_or(false)
    {
        let now = chrono::Utc::now();
        let stored = StoredLicense {
            license_key: license_key.clone(),
            email: email_normalized.clone(),
            activated_at: now.to_rfc3339(),
            last_verified: now.timestamp() + (365 * 24 * 60 * 60), // Valid for 1 year
            is_valid: true,
        };
        
        let license_path = get_license_path();
        let _ = std::fs::write(&license_path, serde_json::to_string_pretty(&stored).unwrap());
        
        return LicenseInfo {
            is_valid: true,
            is_trial: false,
            email: Some(email_normalized),
            purchase_date: Some(stored.activated_at),
            license_key: Some("DEV-****-ACCESS".into()),
            features: get_full_features(),
            limitations: get_no_limitations(),
            error: None,
        };
    }
    
    // Verify with Gumroad
    match verify_with_gumroad(&license_key) {
        Ok((valid, gumroad_email, created_at)) => {
            if !valid {
                return LicenseInfo {
                    is_valid: false,
                    is_trial: true,
                    email: None,
                    purchase_date: None,
                    license_key: None,
                    features: get_trial_features(),
                    limitations: get_trial_limitations(),
                    error: Some("Invalid license key".into()),
                };
            }
            
            // Verify email matches the Gumroad purchase email
            let gumroad_email_normalized = gumroad_email
                .as_ref()
                .map(|e| e.trim().to_lowercase())
                .unwrap_or_default();
            
            if gumroad_email_normalized.is_empty() {
                return LicenseInfo {
                    is_valid: false,
                    is_trial: true,
                    email: Some(email),
                    purchase_date: None,
                    license_key: None,
                    features: get_trial_features(),
                    limitations: get_trial_limitations(),
                    error: Some("Could not verify purchase email - please contact support".into()),
                };
            }
            
            if email_normalized != gumroad_email_normalized {
                return LicenseInfo {
                    is_valid: false,
                    is_trial: true,
                    email: Some(email),
                    purchase_date: None,
                    license_key: None,
                    features: get_trial_features(),
                    limitations: get_trial_limitations(),
                    error: Some("Email does not match purchase email. Please use the email you used to purchase on Gumroad.".into()),
                };
            }
            
            let now = chrono::Utc::now();
            
            // Save the license
            let stored = StoredLicense {
                license_key: license_key.clone(),
                email: email_normalized.clone(),
                activated_at: created_at.unwrap_or_else(|| now.to_rfc3339()),
                last_verified: now.timestamp(),
                is_valid: true,
            };
            
            let license_path = get_license_path();
            if let Err(e) = std::fs::write(&license_path, serde_json::to_string_pretty(&stored).unwrap()) {
                return LicenseInfo {
                    is_valid: false,
                    is_trial: true,
                    email: Some(email_normalized),
                    purchase_date: None,
                    license_key: None,
                    features: get_trial_features(),
                    limitations: get_trial_limitations(),
                    error: Some(format!("Failed to save license: {}", e)),
                };
            }
            
            LicenseInfo {
                is_valid: true,
                is_trial: false,
                email: Some(email_normalized),
                purchase_date: Some(stored.activated_at),
                license_key: Some(mask_license_key(&license_key)),
                features: get_full_features(),
                limitations: get_no_limitations(),
                error: None,
            }
        }
        Err(e) => LicenseInfo {
            is_valid: false,
            is_trial: true,
            email: Some(email),
            purchase_date: None,
            license_key: None,
            features: get_trial_features(),
            limitations: get_trial_limitations(),
            error: Some(e),
        },
    }
}

#[tauri::command]
fn deactivate_license() -> LicenseInfo {
    let license_path = get_license_path();
    std::fs::remove_file(&license_path).ok();
    
    LicenseInfo {
        is_valid: false,
        is_trial: true,
        email: None,
        purchase_date: None,
        license_key: None,
        features: get_trial_features(),
        limitations: get_trial_limitations(),
        error: None,
    }
}


// ============================================================================
// Data Structures
// ============================================================================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ProgressEvent {
    pub step: u32,
    pub total_steps: u32,
    pub message: String,
    pub progress_percent: u32,
    pub timestamp: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct StemInfo {
    pub file_path: String,
    pub format: String,
    pub duration_seconds: f64,
    pub purity_score: f64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SeparationResult {
    pub status: String,
    pub output_directory: String,
    pub stems: std::collections::HashMap<String, StemInfo>,
    pub process_duration_seconds: f64,
    pub errors: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct StemSplitRequest {
    pub file_path: String,
    pub output_dir: Option<String>,
    pub output_format: Option<String>,
    pub mp3_bitrate: Option<u32>,
    pub apply_effects: Option<bool>,
    pub pre_split_fx: Option<String>,
    pub engine: Option<String>,
    pub stems_count: Option<u32>,
    pub passes: Option<u32>,
}

// ============================================================================
// Global State for Tracking Operations
// ============================================================================

struct OperationState {
    is_running: bool,
    process_id: Option<u32>,
}

struct VstPreviewState {
    is_previewing: bool,
    process_id: Option<u32>,
}

lazy_static::lazy_static! {
    static ref OPERATION_STATE: Arc<Mutex<OperationState>> = Arc::new(Mutex::new(OperationState {
        is_running: false,
        process_id: None,
    }));
    
    static ref VST_PREVIEW_STATE: Arc<Mutex<VstPreviewState>> = Arc::new(Mutex::new(VstPreviewState {
        is_previewing: false,
        process_id: None,
    }));
}

/// Drop guard that always resets is_running when execute_splice exits (success or error)
struct RunGuard;
impl Drop for RunGuard {
    fn drop(&mut self) {
        let mut state = OPERATION_STATE.lock().unwrap();
        state.is_running = false;
        state.process_id = None;
    }
}
 
 fn resolve_splitter_script_path() -> std::path::PathBuf {
     let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
 
     let mut candidates: Vec<std::path::PathBuf> = Vec::new();
 
     if let Some(project_root) = manifest_dir.parent() {
         candidates.push(project_root.join("scripts").join("splitter.py"));
     }
 
     candidates.push(manifest_dir.join("scripts").join("splitter.py"));
 
     if let Ok(current_dir) = std::env::current_dir() {
         candidates.push(current_dir.join("scripts").join("splitter.py"));
     }
 
     if let Ok(exe_path) = std::env::current_exe() {
         if let Some(exe_dir) = exe_path.parent() {
             candidates.push(exe_dir.join("scripts").join("splitter.py"));
         }
     }
 
     if let Some(existing) = candidates.iter().find(|path| path.exists()) {
         return existing.clone();
     }
 
     if let Some(project_root) = manifest_dir.parent() {
         return project_root.join("scripts").join("splitter.py");
     }
 
     std::path::PathBuf::from("scripts").join("splitter.py")
 }

fn resolve_python_path() -> String {
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    // 0. Primary: Check for local "embedded_python" folder (used in Release builds/Installer)
    if let Ok(exe_path) = std::env::current_exe() {
       if let Some(exe_dir) = exe_path.parent() {
           #[cfg(target_os = "windows")]
           candidates.push(exe_dir.join("embedded_python").join("python.exe"));
           #[cfg(not(target_os = "windows"))]
           candidates.push(exe_dir.join("embedded_python").join("bin").join("python3"));
       }
    }
    
    // Check in CWD as well
    if let Ok(current_dir) = std::env::current_dir() {
        #[cfg(target_os = "windows")]
        candidates.push(current_dir.join("embedded_python").join("python.exe"));
        #[cfg(not(target_os = "windows"))]
        candidates.push(current_dir.join("embedded_python").join("bin").join("python3"));
    }

    // 1. Try project root .venv (Development mode)
    if let Some(project_root) = manifest_dir.parent() {
        #[cfg(target_os = "windows")]
        candidates.push(project_root.join(".venv").join("Scripts").join("python.exe"));
        #[cfg(not(target_os = "windows"))]
        candidates.push(project_root.join(".venv").join("bin").join("python"));
    }

    // 2. Try current working directory .venv
    if let Ok(current_dir) = std::env::current_dir() {
        #[cfg(target_os = "windows")]
        candidates.push(current_dir.join(".venv").join("Scripts").join("python.exe"));
        #[cfg(not(target_os = "windows"))]
        candidates.push(current_dir.join(".venv").join("bin").join("python"));
    }

    // 3. Try bundled python folder (alternate name)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
             #[cfg(target_os = "windows")]
             candidates.push(exe_dir.join("python").join("python.exe"));
             #[cfg(not(target_os = "windows"))]
             candidates.push(exe_dir.join("python").join("bin").join("python"));
        }
    }

    for path in &candidates {
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    // Fallback to system python
    "python".to_string()
 }

fn get_app_root_dir() -> Result<PathBuf, String> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return Ok(exe_dir.to_path_buf());
        }
    }

    std::env::current_dir().map_err(|e| format!("Failed to resolve app root: {}", e))
}

fn get_asset_base_url() -> String {
    std::env::var("STEMSPLIT_ASSET_BASE_URL")
        .unwrap_or_else(|_| "https://github.com/myaiplug/StemSplit1/releases/latest/download".to_string())
        .trim_end_matches('/')
        .to_string()
}

#[cfg(target_os = "windows")]
fn find_windows_python_executable(env_dir: &Path) -> Option<PathBuf> {
    let candidates = [
        env_dir.join("python.exe"),
        env_dir.join("embedded_python").join("python.exe"),
    ];

    candidates.into_iter().find(|path| path.exists())
}

#[cfg(target_os = "windows")]
fn is_python_runtime_ready(python_exe: &Path) -> bool {
    let checks = ["import torch", "import demucs", "import librosa"];
    checks.iter().all(|snippet| {
        let mut cmd = Command::new(python_exe);
        cmd.args(&["-c", snippet]);
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.output().map(|out| out.status.success()).unwrap_or(false)
    })
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
async fn execute_splice(
    request: StemSplitRequest,
    window: tauri::Window,
) -> Result<SeparationResult, String> {
    enforce_security_hold_if_active()?;

    // Validate input file before any processing starts.
    if let Err(validation_error) = validate_input_audio_file(&request.file_path) {
        if validation_error.malicious {
            let (incident_message, hold) = register_malicious_attempt(&validation_error.message);
            let reopen_unix = security_reopen_unix(&hold);
            let now = chrono::Utc::now().timestamp();

            let report = SecurityIncidentReport {
                event: "malicious_upload_attempt".to_string(),
                timestamp_utc: chrono::Utc::now().to_rfc3339(),
                local_username: get_local_username(),
                machine_name: get_machine_name(),
                license_email: get_stored_license_email(),
                attempted_file_path: request.file_path.clone(),
                reason: validation_error.message.clone(),
                malicious_attempts: hold.malicious_attempts,
                blocked_until_unix: hold.blocked_until_unix,
                permanently_banned: hold.permanently_banned,
            };
            send_security_incident_report(&report).await;

            let _ = window.emit(
                "security-incident",
                serde_json::json!({
                    "message": incident_message,
                    "reason": validation_error.message,
                    "maliciousAttempts": hold.malicious_attempts,
                    "blockedUntilUnix": hold.blocked_until_unix,
                    "reopenUnix": reopen_unix,
                    "permanent": hold.permanently_banned,
                }),
            );

            if should_hide_window_for_security(&hold, now) {
                sleep(Duration::from_millis(2200)).await;
                let _ = window.set_skip_taskbar(true);
                let _ = window.hide();
            }

            return Err(incident_message);
        }

        return Err(validation_error.message);
    }

    // ========================================================================
    // LICENSE ENFORCEMENT - Check trial limitations
    // ========================================================================
    let license = get_license_status();
    
    // Make request mutable so we can auto-correct trial limitations
    let mut request = request;
    
    if license.is_trial {
        // Auto-enforce trial limitations (coerce values instead of rejecting)
        
        // Force 2-stem for trial
        if request.stems_count.map(|s| s > 2).unwrap_or(false) {
            println!("[License] Trial: Auto-correcting stems from {:?} to 2", request.stems_count);
            request.stems_count = Some(2);
        }
        
        // Force Spleeter engine for trial
        if let Some(ref engine) = request.engine {
            let engine_lower = engine.to_lowercase();
            if engine_lower != "spleeter" {
                println!("[License] Trial: Auto-correcting engine from '{}' to 'spleeter'", engine);
                request.engine = Some("spleeter".into());
            }
        } else {
            request.engine = Some("spleeter".into());
        }
        
        // Force MP3 output for trial (auto-correct, don't reject)
        if let Some(ref format) = request.output_format {
            let format_lower = format.to_lowercase();
            if format_lower != "mp3" {
                println!("[License] Trial: Auto-correcting output format from '{}' to 'mp3'", format);
                request.output_format = Some("mp3".into());
            }
        } else {
            // Default to mp3 for trial if not specified
            request.output_format = Some("mp3".into());
        }

        // Force single pass for trial
        if request.passes.map(|p| p > 1).unwrap_or(false) {
            println!("[License] Trial: Auto-correcting passes from {:?} to 1", request.passes);
            request.passes = Some(1);
        } else if request.passes.is_none() {
            request.passes = Some(1);
        }

        // Enforce cooldown between trial splits.
        enforce_trial_cooldown()?;
    }
    // ========================================================================

    // Check if another operation is running
    {
        let mut state = OPERATION_STATE.lock().unwrap();
        if state.is_running {
            return Err("Another stem split operation is already running".to_string());
        }
        state.is_running = true;
    }
    // Guard ensures is_running is always reset on any exit path (success, error, panic)
    let _run_guard = RunGuard;

    // Determine output directory
    let output_dir = if let Some(dir) = request.output_dir {
        dir
    } else {
        let input_path = Path::new(&request.file_path);
        let parent = input_path.parent().unwrap_or_else(|| Path::new("."));
        let file_stem = input_path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        
        let mut base_dir = parent.join(format!("{} Stems", file_stem));
        let mut counter = 1;
        
        while base_dir.exists() {
            base_dir = parent.join(format!("{} Stems ({})", file_stem, counter));
            counter += 1;
        }
        
        base_dir.to_string_lossy().to_string()
    };

    // Build path to Python script
    let script_path = resolve_splitter_script_path();

    let splitter_script = script_path.to_string_lossy().to_string();

    if !script_path.exists() {
        let cwd = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "<unknown>".to_string());
        return Err(format!(
            "splitter.py not found. Resolved path: {} | CWD: {}",
            splitter_script, cwd
        ));
    }

    // Build arguments
    let mut cmd_args = vec![
        splitter_script,
        request.file_path.clone(),
        "--output".to_string(),
        output_dir.clone(),
    ];

    // Add optional parameters
    if let Some(format) = request.output_format {
        cmd_args.push("--format".to_string());
        cmd_args.push(format);
    }

    if let Some(bitrate) = request.mp3_bitrate {
        cmd_args.push("--bitrate".to_string());
        cmd_args.push(bitrate.to_string());
    }

    if let Some(apply_effects) = &request.apply_effects {
        if !apply_effects {
            cmd_args.push("--no-effects".to_string());
        }
    }

    if let Some(fx) = &request.pre_split_fx {
        cmd_args.push("--fx-config".to_string());
        cmd_args.push(fx.clone());
    }

    if let Some(engine) = &request.engine {
        cmd_args.push("--engine".to_string());
        cmd_args.push(engine.clone());
    }
    
    if let Some(stems_count) = request.stems_count {
        cmd_args.push("--stems".to_string());
        cmd_args.push(stems_count.to_string());
    }

    if let Some(passes) = request.passes {
        cmd_args.push("--passes".to_string());
        cmd_args.push(passes.to_string());
    }

    // Add trial mode limitations to Python script
    if license.is_trial {
        cmd_args.push("--trial-mode".to_string());
        cmd_args.push("--max-duration".to_string());
        cmd_args.push(license.limitations.max_duration_seconds.to_string());
    }

    // Spawn Python subprocess (hidden window on Windows)
    let python_exe = resolve_python_path();
    let mut cmd = Command::new(&python_exe);
    cmd.args(&cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}", e))?;

    let process_id = child.id();
    {
        let mut state = OPERATION_STATE.lock().unwrap();
        state.process_id = Some(process_id);
    }

    // Capture stdout for progress events
    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let reader = BufReader::new(stdout);

    // CRITICAL: Drain stderr on a separate thread to prevent pipe deadlock.
    // On Windows, if the stderr pipe buffer fills (~4KB), Python blocks on its next
    // stderr write while Rust is blocked waiting for more stdout — classic deadlock.
    let stderr = child.stderr.take();
    let stderr_handle = std::thread::spawn(move || -> String {
        if let Some(stderr_stream) = stderr {
            let mut buf = String::new();
            let mut reader = BufReader::new(stderr_stream);
            let _ = reader.read_to_string(&mut buf);
            buf
        } else {
            String::new()
        }
    });

    let mut errors = Vec::new();

    // Read lines from stdout
    for line in reader.lines() {
        match line {
            Ok(json_line) => {
                // Try to parse as JSON (progress events)
                if let Ok(progress) = serde_json::from_str::<serde_json::Value>(&json_line) {
                    if let Some("progress") = progress.get("event").and_then(|v| v.as_str()) {
                        // Emit progress event to frontend
                        if let (Some(step), Some(total), Some(msg), Some(pct)) = (
                            progress.get("step").and_then(|v| v.as_u64()),
                            progress.get("total_steps").and_then(|v| v.as_u64()),
                            progress.get("message").and_then(|v| v.as_str()),
                            progress.get("progress_percent").and_then(|v| v.as_u64()),
                        ) {
                            let _ = window.emit("stem-split-progress", ProgressEvent {
                                step: step as u32,
                                total_steps: total as u32,
                                message: msg.to_string(),
                                progress_percent: pct as u32,
                                timestamp: progress
                                    .get("timestamp")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                            });
                        }
                    }
                }
            }
            Err(e) => {
                errors.push(format!("Error reading stdout: {}", e));
            }
        }
    }

    // Wait for process to complete
    let status = child.wait().map_err(|e| format!("Failed to wait for child: {}", e))?;

    // Collect stderr from the drain thread (won't block now — process already exited)
    let stderr_output = stderr_handle.join().unwrap_or_default();

    // RunGuard handles cleanup, but we can explicitly drop it here for clarity
    drop(_run_guard);

    let manifest_path = Path::new(&output_dir).join("manifest.json");

    if !status.success() {
        if manifest_path.exists() {
            if let Ok(manifest_content) = std::fs::read_to_string(&manifest_path) {
                return Err(manifest_content);
            }
        }

        return Err(format!(
            "Python process failed with status {}: {}",
            status.code().unwrap_or(-1),
            stderr_output
        ));
    }

    // Try to read manifest from output directory
    if manifest_path.exists() {
        match std::fs::read_to_string(&manifest_path) {
            Ok(manifest_content) => {
                match serde_json::from_str::<SeparationResult>(&manifest_content) {
                    Ok(result) => {
                        if license.is_trial && result.status == "success" {
                            register_trial_split_completion();
                        }
                        return Ok(result);
                    }
                    Err(e) => {
                        errors.push(format!("Failed to parse manifest: {}", e));
                    }
                }
            }
            Err(e) => {
                errors.push(format!("Failed to read manifest: {}", e));
            }
        }
    }

    // Return fallback result
    Ok(SeparationResult {
        status: if errors.is_empty() {
            "success".to_string()
        } else {
            "partial".to_string()
        },
        output_directory: output_dir,
        stems: std::collections::HashMap::new(),
        process_duration_seconds: 0.0,
        errors,
    })
}

#[tauri::command]
fn open_results_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn cancel_stem_split() -> Result<String, String> {
    let mut state = OPERATION_STATE.lock().unwrap();
    if let Some(pid) = state.process_id {
        // Kill the process
        let cmd = if cfg!(windows) {
            let mut c = Command::new("taskkill");
            c.args(&["/PID", &pid.to_string(), "/F"]);
            #[cfg(target_os = "windows")]
            c.creation_flags(CREATE_NO_WINDOW);
            c.spawn()
        } else {
            Command::new("kill")
                .args(&[&pid.to_string()])
                .spawn()
        };

        match cmd {
            Ok(mut child) => {
                let _ = child.wait();
                state.is_running = false;
                state.process_id = None;
                Ok("Operation cancelled successfully".to_string())
            }
            Err(e) => Err(format!("Failed to cancel operation: {}", e)),
        }
    } else {
        // Always reset state even if no process found (stuck state recovery)
        state.is_running = false;
        state.process_id = None;
        Ok("Operation state reset".to_string())
    }
}

#[tauri::command]
fn get_separator_status() -> Result<String, String> {
    let state = OPERATION_STATE.lock().unwrap();
    if state.is_running {
        Ok("processing".to_string())
    } else {
        Ok("idle".to_string())
    }
}

#[tauri::command]
async fn apply_stem_fx(
    stem_path: String,
    fx_json: String,
) -> Result<String, String> {
    if !Path::new(&stem_path).exists() {
        return Err(format!("Stem file not found: {}", stem_path));
    }

    // Resolve apply_fx.py script path
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let script_path = if let Some(root) = manifest_dir.parent() {
        root.join("scripts").join("apply_fx.py")
    } else {
        manifest_dir.join("scripts").join("apply_fx.py")
    };

    if !script_path.exists() {
        return Err(format!("apply_fx.py not found at: {}", script_path.display()));
    }

    let python_exe = resolve_python_path();
    let mut cmd = Command::new(&python_exe);
    cmd.args(&[
        script_path.to_string_lossy().to_string(),
        stem_path.clone(),
        "--fx".to_string(),
        fx_json.clone(),
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    // Ensure we run in project root so relative imports (if any) or file paths work as expected
    .current_dir(manifest_dir.parent().unwrap_or(&manifest_dir));

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output()
        .map_err(|e| format!("Failed to run apply_fx.py: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FX processing failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Find the last JSON line (apply_fx.py prints result JSON)
    let json_line = stdout.lines().rev()
        .find(|l| l.trim_start().starts_with('{'))
        .ok_or("No JSON output from apply_fx.py")?;

    Ok(json_line.to_string())
}

#[tauri::command]
async fn preview_vst_plugin(
    window: tauri::Window,
    vst_path: String,
    audio_path: String,
) -> Result<String, String> {
    // Resolve preview_vst.py script path
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let script_path = if let Some(root) = manifest_dir.parent() {
        root.join("scripts").join("preview_vst.py")
    } else {
        manifest_dir.join("scripts").join("preview_vst.py")
    };

    if !script_path.exists() {
        return Err(format!("preview_vst.py not found at: {}", script_path.display()));
    }

    let python_exe = resolve_python_path();
    let mut cmd = Command::new(&python_exe);
    cmd.args(&[
        script_path.to_string_lossy().to_string(),
        vst_path.clone(),
        audio_path,
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .current_dir(manifest_dir.parent().unwrap_or(&manifest_dir));

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to start preview_vst.py: {}", e))?;

    let my_pid = child.id();

    // Store PID for cancellation
    {
        let mut state = VST_PREVIEW_STATE.lock().unwrap();
        state.is_previewing = true;
        state.process_id = Some(my_pid);
    }

    let stdout = child.stdout.take()
        .ok_or("Failed to open stdout")?;
    
    let reader = BufReader::new(stdout);
    
    for line in reader.lines() {
        match line {
            Ok(l) => {
                if l.starts_with("STATE:") {
                   // Emit event: STATE:<b64>
                   let state_b64 = &l[6..];
                   if let Err(e) = window.emit("vst-state-update", state_b64) {
                       eprintln!("Failed to emit event: {}", e);
                   }
                }
            }
            Err(_) => break,
        }
    }
    
    let status = child.wait().map_err(|e| e.to_string())?;
    
    // Clear State on completion (only if we are still the active process)
    {
        let mut state = VST_PREVIEW_STATE.lock().unwrap();
        if state.process_id == Some(my_pid) {
            state.is_previewing = false;
            state.process_id = None;
        }
    }

    if status.success() {
        Ok("Preview finished".to_string())
    } else {
        // If killed manually, it might return non-success, which is fine
        Ok("Preview stopped".to_string())
    }
}

#[tauri::command]
fn stop_vst_plugin() -> Result<String, String> {
    let mut state = VST_PREVIEW_STATE.lock().unwrap();
    if let Some(pid) = state.process_id {
        #[cfg(target_os = "windows")]
        let _ = Command::new("taskkill")
            .args(&["/F", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        #[cfg(not(target_os = "windows"))]
        let _ = Command::new("kill")
            .arg("-9")
            .arg(&pid.to_string())
            .output();
            
        state.is_previewing = false;
        state.process_id = None;
        Ok("VST Preview Stopped".to_string())
    } else {
        Ok("No VST preview running".to_string())
    }
}

// ============================================================================
// Python Environment Management
// ============================================================================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PythonStatus {
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub packages_installed: bool,
    pub missing_packages: Vec<String>,
}

fn get_python_env_dir() -> std::path::PathBuf {
    // Check multiple possible locations for embedded_python
    let possible_paths: Vec<std::path::PathBuf> = {
        let mut paths = Vec::new();
        
        // 1. Current working directory (project root in dev mode)
        if let Ok(cwd) = std::env::current_dir() {
            paths.push(cwd.join("embedded_python"));
        }
        
        // 2. Relative to executable
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                // Production: beside the exe
                #[cfg(target_os = "windows")]
                paths.push(exe_dir.join("embedded_python"));
                #[cfg(target_os = "macos")]
                paths.push(exe_dir.join("../Resources/python_env"));
                #[cfg(target_os = "linux")]
                paths.push(exe_dir.join("python_env"));
                
                // Dev mode: project root (exe is in src-tauri/target/debug or release)
                // Go up from src-tauri/target/debug -> src-tauri/target -> src-tauri -> project_root
                paths.push(exe_dir.join("../../../embedded_python"));
                paths.push(exe_dir.join("../../embedded_python"));
            }
        }
        
        paths
    };
    
    // Return first existing path
    for path in possible_paths {
        let check_path = path.join("python.exe");
        if check_path.exists() {
            return path;
        }
    }
    
    // Fallback
    std::path::PathBuf::from("embedded_python")
}

fn get_python_executable() -> Option<std::path::PathBuf> {
    let env_dir = get_python_env_dir();
    
    #[cfg(target_os = "windows")]
    let python_path = env_dir.join("python.exe");
    #[cfg(not(target_os = "windows"))]
    let python_path = env_dir.join("bin").join("python3");
    
    if python_path.exists() {
        Some(python_path)
    } else {
        None
    }
}

#[tauri::command]
async fn check_python_status() -> Result<PythonStatus, String> {
    let python_exe = get_python_executable();
    
    if let Some(ref exe) = python_exe {
        // Check version
        let mut cmd = Command::new(exe);
        cmd.arg("--version");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);
        
        let version = cmd.output().ok().and_then(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

            if !stdout.is_empty() {
                Some(stdout)
            } else if !stderr.is_empty() {
                Some(stderr)
            } else {
                None
            }
        });
        
        // Check required packages
        let required = vec!["torch", "demucs", "librosa", "soundfile", "pedalboard"];
        let mut missing = Vec::new();
        
        for pkg in &required {
            let mut check_cmd = Command::new(exe);
            check_cmd.args(&["-c", &format!("import {}", pkg)]);
            #[cfg(target_os = "windows")]
            check_cmd.creation_flags(CREATE_NO_WINDOW);
            
            if !check_cmd.output().map(|o| o.status.success()).unwrap_or(false) {
                missing.push(pkg.to_string());
            }
        }
        
        Ok(PythonStatus {
            installed: true,
            path: Some(exe.to_string_lossy().to_string()),
            version,
            packages_installed: missing.is_empty(),
            missing_packages: missing,
        })
    } else {
        Ok(PythonStatus {
            installed: false,
            path: None,
            version: None,
            packages_installed: false,
            missing_packages: vec!["torch".into(), "demucs".into(), "librosa".into()],
        })
    }
}

#[tauri::command]
async fn setup_python_environment(window: tauri::Window) -> Result<String, String> {
    let env_dir = get_python_env_dir();
    let system_profile = hardware::get_system_profile().await.unwrap_or_else(|_| hardware::SystemProfile {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        has_nvidia: false,
        has_apple_silicon: cfg!(all(target_os = "macos", target_arch = "aarch64")),
        recommended_payload: if cfg!(target_os = "windows") {
            "python_env_win_cpu.zip".to_string()
        } else if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
            "python_env_mac_arm64.zip".to_string()
        } else if cfg!(target_os = "macos") {
            "python_env_mac_x64.zip".to_string()
        } else {
            "python_env_linux.zip".to_string()
        },
    });
    
    // Create directory if needed
    std::fs::create_dir_all(&env_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    // Emit progress
    let emit_progress = |msg: &str, pct: u32| {
        let _ = window.emit("python-setup-progress", serde_json::json!({
            "message": msg,
            "percent": pct
        }));
    };
    
    emit_progress("Starting Python environment setup...", 0);
    emit_progress(
        &format!(
            "Detected {} / {} -> {}",
            system_profile.os,
            system_profile.arch,
            system_profile.recommended_payload
        ),
        2,
    );
    
    #[cfg(target_os = "windows")]
    {
        let payload_url = format!("{}/{}", get_asset_base_url(), system_profile.recommended_payload);
        let payload_zip_path = env_dir.join("runtime_payload.zip");
        let runtime_checksum = std::env::var("STEMSPLIT_RUNTIME_PAYLOAD_SHA256").ok();

        emit_progress(
            &format!(
                "Trying optimized runtime package ({})...",
                system_profile.recommended_payload
            ),
            5,
        );

        let prebuilt_ready = match downloader::stream_download_to_path(
            &window,
            &payload_url,
            &payload_zip_path,
            "python-setup-progress",
            runtime_checksum.as_deref(),
        ).await {
            Ok(_) => {
                emit_progress("Extracting optimized runtime package...", 20);
                match extract_zip(&payload_zip_path, &env_dir) {
                    Ok(_) => {
                        if let Some(python_exe) = find_windows_python_executable(&env_dir) {
                            if is_python_runtime_ready(&python_exe) {
                                emit_progress("Optimized runtime package ready", 100);
                                std::fs::remove_file(&payload_zip_path).ok();
                                return Ok("Python environment ready (prebuilt runtime)".into());
                            }
                        }
                        false
                    }
                    Err(_) => false,
                }
            }
            Err(_) => false,
        };

        if !prebuilt_ready {
            emit_progress("Optimized package unavailable, switching to standard setup...", 18);
        }

        // Download Python embeddable
        emit_progress("Downloading Python 3.10...", 5);
        let python_url = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip";
        let zip_path = env_dir.join("python.zip");
        
        downloader::stream_download_to_path(&window, python_url, &zip_path, "python-setup-progress", None).await?;
        
        emit_progress("Extracting Python...", 30);
        extract_zip(&zip_path, &env_dir)?;
        std::fs::remove_file(&zip_path).ok();
        
        // Enable site-packages
        let pth_file = env_dir.join("python310._pth");
        if pth_file.exists() {
            let content = std::fs::read_to_string(&pth_file).unwrap_or_default();
            let new_content = content.replace("#import site", "import site");
            std::fs::write(&pth_file, new_content).ok();
        }
        
        // Install pip
        emit_progress("Installing pip...", 35);
        let getpip_url = "https://bootstrap.pypa.io/get-pip.py";
        let getpip_path = env_dir.join("get-pip.py");
        downloader::stream_download_to_path(&window, getpip_url, &getpip_path, "python-setup-progress", None).await?;
        
        let python_exe = env_dir.join("python.exe");
        let mut cmd = Command::new(&python_exe);
        cmd.arg(&getpip_path).arg("--no-warn-script-location");
        cmd.current_dir(&env_dir);
        cmd.creation_flags(CREATE_NO_WINDOW);
        let getpip_output = cmd
            .output()
            .map_err(|e| format!("Failed to install pip: {}", e))?;
        if !getpip_output.status.success() {
            let stderr = String::from_utf8_lossy(&getpip_output.stderr).trim().to_string();
            let stdout = String::from_utf8_lossy(&getpip_output.stdout).trim().to_string();
            let details = if !stderr.is_empty() { stderr } else { stdout };
            return Err(format!("pip bootstrap failed: {}", details));
        }
        std::fs::remove_file(&getpip_path).ok();
        
        // Install packages
        let torch_packages = if system_profile.has_nvidia {
            emit_progress("Installing PyTorch with CUDA support...", 40);
            "torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118"
        } else {
            emit_progress("Installing PyTorch CPU runtime...", 40);
            "torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu"
        };
        install_package(&python_exe, torch_packages)?;
        
        emit_progress("Installing Demucs...", 70);
        install_package(&python_exe, "demucs")?;
        
        emit_progress("Installing audio libraries...", 85);
        install_package(&python_exe, "librosa soundfile pedalboard pydub numpy resampy tqdm psutil pynvml sounddevice pyloudnorm")?;
    }
    
    #[cfg(target_os = "macos")]
    {
        emit_progress("Setting up Python environment...", 5);
        
        // Check if system python3 exists
        let has_python = Command::new("python3").arg("--version").output().map(|o| o.status.success()).unwrap_or(false);
        
        if !has_python {
            return Err("Python 3 not found. Please install Python from python.org or via Homebrew: brew install python@3.10".into());
        }
        
        // Check if FFmpeg is available
        let has_ffmpeg = Command::new("ffmpeg").arg("-version").output().map(|o| o.status.success()).unwrap_or(false);
        if !has_ffmpeg {
            emit_progress("Note: FFmpeg not found. Install via: brew install ffmpeg", 8);
        }
        
        // Create venv in our app directory
        emit_progress("Creating virtual environment...", 10);
        let mut cmd = Command::new("python3");
        cmd.args(&["-m", "venv", env_dir.to_str().unwrap()]);
        let result = cmd.output().map_err(|e| format!("Failed to create venv: {}", e))?;
        if !result.status.success() {
            return Err("Failed to create Python virtual environment".into());
        }
        
        let pip_path = env_dir.join("bin").join("pip3");
        
        // Upgrade pip first
        emit_progress("Upgrading pip...", 15);
        let mut cmd = Command::new(&pip_path);
        cmd.args(&["install", "--upgrade", "pip", "setuptools", "wheel"]);
        cmd.output().ok();
        
        emit_progress("Installing PyTorch (this may take several minutes)...", 20);
        let mut cmd = Command::new(&pip_path);
        cmd.args(&["install", "torch", "torchvision", "torchaudio"]);
        let result = cmd.output().map_err(|e| format!("Failed to install torch: {}", e))?;
        if !result.status.success() {
            return Err(format!("PyTorch installation failed: {}", String::from_utf8_lossy(&result.stderr)));
        }
        
        emit_progress("Installing Demucs...", 50);
        let mut cmd = Command::new(&pip_path);
        cmd.args(&["install", "demucs"]);
        let result = cmd.output().map_err(|e| format!("Failed to install demucs: {}", e))?;
        if !result.status.success() {
            return Err(format!("Demucs installation failed: {}", String::from_utf8_lossy(&result.stderr)));
        }
        
        emit_progress("Installing audio libraries...", 75);
        let mut cmd = Command::new(&pip_path);
        cmd.args(&["install", "librosa", "soundfile", "pedalboard", "pydub", "numpy", "resampy", "tqdm", "psutil", "pyloudnorm", "sounddevice"]);
        let result = cmd.output().map_err(|e| format!("Failed to install packages: {}", e))?;
        if !result.status.success() {
            return Err(format!("Package installation failed: {}", String::from_utf8_lossy(&result.stderr)));
        }
    }
    
    emit_progress("Setup complete!", 100);
    Ok("Python environment ready".into())
}

#[tauri::command]
async fn install_support_asset(
    request: SupportAssetRequest,
    window: tauri::Window,
) -> Result<SupportAssetInstallResult, String> {
    let app_root = get_app_root_dir()?;
    let destination_dir = app_root.join(&request.relative_destination);
    let cache_dir = app_root.join("downloads");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create download cache: {}", e))?;
    std::fs::create_dir_all(&destination_dir)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    let asset_filename = request
        .download_url
        .rsplit('/')
        .next()
        .filter(|name| !name.is_empty())
        .unwrap_or("support_asset.zip");
    let archive_path = cache_dir.join(asset_filename);

    downloader::stream_download_to_path(
        &window,
        &request.download_url,
        &archive_path,
        "support-asset-download-progress",
        request.checksum.as_deref(),
    ).await?;

    extract_zip(&archive_path, &destination_dir)?;

    Ok(SupportAssetInstallResult {
        asset_name: request.asset_name,
        installed_to: destination_dir.to_string_lossy().to_string(),
    })
}

fn install_package(python_exe: &std::path::Path, packages: &str) -> Result<(), String> {
    let mut cmd = Command::new(python_exe);
    cmd.args(&["-m", "pip", "install"]);
    cmd.args(packages.split_whitespace());
    cmd.arg("--no-warn-script-location");
    cmd.arg("--no-cache-dir");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to install {}: {}", packages, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let details = if !stderr.is_empty() { stderr } else { stdout };
        return Err(format!("pip install failed for {}: {}", packages, details));
    }

    Ok(())
}

fn extract_zip(zip_path: &std::path::Path, dest_dir: &std::path::Path) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| format!("Zip error: {}", e))?;
        let outpath = dest_dir.join(file.name());
        
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).ok();
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p).ok();
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| format!("Failed to create file: {}", e))?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| format!("Failed to extract: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn health_check() -> Result<String, String> {
    Ok(serde_json::json!({
        "status": "healthy",
        "version": "0.1.0",
        "python_available": check_python_available(),
    }).to_string())
}

fn check_python_available() -> bool {
    let mut cmd = Command::new("python");
    cmd.arg("--version");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            enforce_window_security_policy(&app.app_handle());
            tauri::async_runtime::spawn(async {
                flush_queued_security_incidents().await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            execute_splice,
            cancel_stem_split,
            get_separator_status,
            health_check,
            open_results_folder,
            apply_stem_fx,
            preview_vst_plugin,
            stop_vst_plugin,
            check_python_status,
            setup_python_environment,
            install_support_asset,
            // License commands
            get_license_status,
            activate_license,
            deactivate_license,
            get_trial_cooldown_status,
            test_security_webhook,
            // Hardware and downloading
            hardware::get_system_profile,
            downloader::download_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
