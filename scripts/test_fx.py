
import os
import json
import subprocess
import numpy as np
import soundfile as sf
import sys

# Constants
TEST_DIR = "test_audio"
TEST_FILE = os.path.join(TEST_DIR, "test_source.wav")
SCRIPT_PATH = os.path.join("scripts", "apply_fx.py")
PYTHON_EXE = sys.executable

def generate_test_signal():
    """Generates a stereo test signal: 44.1kHz, 3 seconds."""
    msg = f"Generating test signal at {TEST_FILE}..."
    print(msg)
    
    if not os.path.exists(TEST_DIR):
        os.makedirs(TEST_DIR)
        
    sr = 44100
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration))
    
    # Left channel: 440Hz Sine
    L = 0.5 * np.sin(2 * np.pi * 440 * t)
    # Right channel: 880Hz Sine
    R = 0.5 * np.sin(2 * np.pi * 880 * t)
    
    # Add some silence gaps for Gate testing
    mask = np.ones_like(t)
    mask[int(1.0*sr):int(1.5*sr)] = 0 # 0.5s silence
    
    L = L * mask
    R = R * mask
    
    stereo_signal = np.stack([L, R], axis=1) # (N, 2)
    
    sf.write(TEST_FILE, stereo_signal, sr)
    print("Test signal ready.\n")

def run_test(name, fx_config):
    print(f"Testing: {name}")
    print(f"  Config: {json.dumps(fx_config)}")
    
    json_str = json.dumps(fx_config)
    
    cmd = [PYTHON_EXE, SCRIPT_PATH, TEST_FILE, "--fx", json_str]
    
    try:
        # Run process
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Check STDERR for logging (optional, can print if failed)
        if result.returncode != 0:
            print(f"  [FAILED] Process returned {result.returncode}")
            print(f"  Stderr: {result.stderr}")
            return False

        # Parse STDOUT (JSON result)
        try:
            output_json = json.loads(result.stdout.strip())
        except json.JSONDecodeError:
            print(f"  [FAILED] Invalid JSON output")
            print(f"  Raw Output: {result.stdout}")
            print(f"  Stderr: {result.stderr}")
            return False
            
        if output_json.get("status") == "success":
            out_path = output_json.get("output_path")
            if os.path.exists(out_path):
                print(f"  [PASS] Output generated: {out_path}")
                return True
            else:
                print(f"  [FAILED] Output file reported but not found: {out_path}")
                return False
        else:
            print(f"  [FAILED] Script reported error: {output_json.get('message')}")
            return False

    except Exception as e:
        print(f"  [ERROR] Execution failed: {e}")
        return False

def main():
    print("=== FX UNIT TESTS START ===")
    generate_test_signal()
    
    tests = [
        {
            "name": "Noise Gate",
            "config": {
                "modules": [{
                    "id": "gate", 
                    "params": {"threshold": -20, "ratio": 10, "attack": 5, "release": 50}
                }]
            }
        },
        {
            "name": "Compressor (Auto-Makeup)",
            "config": {
                "modules": [{
                    "id": "compressor", 
                    "params": {"threshold": -25, "ratio": 4, "attack": 10, "release": 100}
                }]
            }
        },
        {
            "name": "3-Band EQ (Musical Curves)",
            "config": {
                "modules": [{
                    "id": "eq", 
                    "params": {"low": 4.0, "mid": -2.0, "high": 5.0, "freq_mid": 1000}
                }]
            }
        },
        {
            "name": "Analog Saturation (Warmth)",
            "config": {
                "modules": [{
                    "id": "saturation", 
                    "params": {"drive": 50}
                }]
            }
        },
        {
            "name": "Reverb (Abbey Road Style)",
            "config": {
                "modules": [{
                    "id": "reverb", 
                    "params": {"room_size": 80, "damping": 40, "wet": 40, "width": 100}
                }]
            }
        },
        {
            "name": "Delay",
            "config": {
                "modules": [{
                    "id": "delay", 
                    "params": {"time": 500, "feedback": 40, "mix": 50}
                }]
            }
        },
        {
            "name": "Stereo Width (Bass Mono)",
            "config": {
                "modules": [{
                    "id": "stereo-width", 
                    "params": {"width": 150}
                }]
            }
        },
        {
            "name": "Multi-FX Chain",
            "config": {
                "modules": [
                    {"id": "eq", "params": {"low": 2}},
                    {"id": "saturation", "params": {"drive": 20}},
                    {"id": "stereo-width", "params": {"width": 120}}
                ]
            }
        }
    ]
    
    results = []
    for t in tests:
        success = run_test(t["name"], t["config"])
        results.append((t["name"], success))
        print("-" * 50)
        
    print("\n=== SUMMARY ===")
    all_passed = True
    for name, success in results:
        status = "PASS" if success else "FAIL"
        print(f"{name:30} : {status}")
        if not success: all_passed = False
        
    if all_passed:
        print("\nAll effects verified successfully! 🚀")
        sys.exit(0)
    else:
        print("\nSome tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
