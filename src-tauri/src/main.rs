// Tauri Backend - Stem Split Application
// Professional stem separation with progress tracking and event emission

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Read};
use std::sync::{Arc, Mutex};
use std::path::Path;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;


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

    // 0. Primary: Check for local "python_embed" folder (used in Release builds/Installer)
    if let Ok(exe_path) = std::env::current_exe() {
       if let Some(exe_dir) = exe_path.parent() {
           #[cfg(target_os = "windows")]
           candidates.push(exe_dir.join("python_embed").join("python.exe"));
       }
    }
    
    // Check in CWD as well
    if let Ok(current_dir) = std::env::current_dir() {
        #[cfg(target_os = "windows")]
        candidates.push(current_dir.join("python_embed").join("python.exe"));
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

    // 3. Try bundled python (if shipped with app)
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

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
async fn execute_splice(
    request: StemSplitRequest,
    window: tauri::Window,
) -> Result<SeparationResult, String> {
    // Validate input file
    if !Path::new(&request.file_path).exists() {
        return Err(format!("Input file not found: {}", request.file_path));
    }

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

    if !status.success() {
        return Err(format!(
            "Python process failed with status {}: {}",
            status.code().unwrap_or(-1),
            stderr_output
        ));
    }

    // Try to read manifest from output directory
    let manifest_path = format!("{}\\manifest.json", output_dir);
    if Path::new(&manifest_path).exists() {
        match std::fs::read_to_string(&manifest_path) {
            Ok(manifest_content) => {
                match serde_json::from_str::<SeparationResult>(&manifest_content) {
                    Ok(result) => {
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
        .invoke_handler(tauri::generate_handler![
            execute_splice,
            cancel_stem_split,
            get_separator_status,
            health_check,
            open_results_folder,
            apply_stem_fx,
            preview_vst_plugin,
            stop_vst_plugin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
