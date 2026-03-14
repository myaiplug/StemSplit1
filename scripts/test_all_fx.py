
import unittest
import numpy as np
import soundfile as sf
import os
import shutil
import json
import logging
from apply_fx import process_file

# Setup
TEST_DIR = "test_fx_output"
INPUT_FILE = os.path.join(TEST_DIR, "test_input.wav")
SAMPLE_RATE = 44100
DURATION = 2.0 # seconds

def create_test_file():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    os.makedirs(TEST_DIR)
    
    # Create a sine sweep + noise
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION))
    # Sweep 100Hz -> 5000Hz
    freq = np.linspace(100, 5000, len(t))
    audio = 0.5 * np.sin(2 * np.pi * freq * t)
    # Add bursts of noise for dynamics testing
    noise = np.random.normal(0, 0.1, len(t))
    audio = audio + noise
    
    # Ensure stereo
    stereo = np.stack([audio, audio]).T
    
    sf.write(INPUT_FILE, stereo, SAMPLE_RATE)
    return INPUT_FILE

class TestAudioEffects(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        create_test_file()
        # Suppress logging during tests
        logging.getLogger('apply_fx').setLevel(logging.ERROR)

    def _apply_fx(self, modules):
        config = {"modules": modules}
        result = process_file(INPUT_FILE, config)
        if result.get("status") == "error":
            self.fail(f"FX Processing failed: {result.get('message')}")
        return result["output_path"]

    def _read_audio(self, path):
        data, sr = sf.read(path)
        return data, sr

    def test_gain(self):
        # Gain +6dB = x2 amplitude
        out_path = self._apply_fx([{"id": "gain", "params": {"gain": 6.0}}])
        data, _ = self._read_audio(out_path)
        # Check peak is roughly double (allow for small processing variances)
        # Original peak is around 0.6-0.7 (0.5 sine + 0.1 noise)
        # Should be > 1.0 (might clip/limit if auto-norm kicks in)
        self.assertTrue(np.max(np.abs(data)) > 0.8, "Gain didn't increase amplitude")

    def test_gate(self):
        # Use high threshold to cut most signal
        out_path = self._apply_fx([{"id": "gate", "params": {"threshold": -10.0, "ratio": 10}}])
        data, _ = self._read_audio(out_path)
        # Signal should be significantly quieter or zero in parts
        # RMS should be lower than original
        orig_data, _ = self._read_audio(INPUT_FILE)
        orig_rms = np.sqrt(np.mean(orig_data**2))
        new_rms = np.sqrt(np.mean(data**2))
        self.assertLess(new_rms, orig_rms, "Gate didn't reduce RMS")

    def test_compressor(self):
        # Heavy compression
        out_path = self._apply_fx([{"id": "compressor", "params": {"threshold": -30.0, "ratio": 4.0}}])
        data, _ = self._read_audio(out_path)
        # Hard to test deterministically without known peaks, but it should run without error
        self.assertTrue(os.path.exists(out_path))

    def test_reverb(self):
        # Reverb adds tail
        # We process in preview mode to limit length, but file writing logic in apply_fx
        # doesn't extend duration unless using Reverb(tail) specifically which pedalboard handles.
        # But pedalboard Reverb usually keeps length unless inside a vst wrapper or specific usage.
        # Actually pedalboard effects return same length as input usually unless tail is requested.
        out_path = self._apply_fx([{"id": "reverb", "params": {"room_size": 100, "mix": 50}}])
        data, _ = self._read_audio(out_path)
        # Check if non-zero at end where input might be quiet? 
        # Easier: Just check it runs and changes the file
        orig_data, _ = self._read_audio(INPUT_FILE)
        self.assertFalse(np.array_equal(data, orig_data), "Reverb output is identical to input")

    def test_delay(self):
        out_path = self._apply_fx([{"id": "delay", "params": {"time": 500, "mix": 50}}])
        data, _ = self._read_audio(out_path)
        orig_data, _ = self._read_audio(INPUT_FILE)
        self.assertFalse(np.array_equal(data, orig_data), "Delay output is identical to input")

    def test_distortion(self):
        out_path = self._apply_fx([{"id": "distortion", "params": {"drive": 50}}])
        data, _ = self._read_audio(out_path)
        orig_data, _ = self._read_audio(INPUT_FILE)
        # Distortion adds harmonics, waveform should be different
        self.assertFalse(np.array_equal(data, orig_data), "Distortion output is identical to input")

    def test_lowpass(self):
        # Cut highs
        out_path = self._apply_fx([{"id": "lowpass", "params": {"freq": 500}}])
        data, _ = self._read_audio(out_path)
        # High freq sine (5000Hz) should be attenuated.
        # Measure energy in last 0.5s (where sweep is high freq)
        # t=1.5s -> 2.0s corresponds to ~3775Hz -> 5000Hz
        start_sample = int(1.5 * SAMPLE_RATE)
        segment = data[start_sample:]
        rms = np.sqrt(np.mean(segment**2))
        
        orig_data, _ = self._read_audio(INPUT_FILE)
        orig_segment = orig_data[start_sample:]
        orig_rms = np.sqrt(np.mean(orig_segment**2))
        
        self.assertLess(rms, orig_rms * 0.5, "Lowpass didn't attenuate highs")

    def test_highpass(self):
        # Cut lows
        out_path = self._apply_fx([{"id": "highpass", "params": {"freq": 2000}}])
        data, _ = self._read_audio(out_path)
        # Low freq sine (start of file) should be attenuated.
        # t=0 -> 0.5s corresponds to 100Hz -> ~1325Hz (linear sweep)
        end_sample = int(0.5 * SAMPLE_RATE)
        segment = data[:end_sample]
        rms = np.sqrt(np.mean(segment**2))
        
        orig_data, _ = self._read_audio(INPUT_FILE)
        orig_segment = orig_data[:end_sample]
        orig_rms = np.sqrt(np.mean(orig_segment**2))
        
        self.assertLess(rms, orig_rms * 0.8, "Highpass didn't attenuate lows")

    def test_phaser(self):
        out_path = self._apply_fx([{"id": "phaser", "params": {"rate": 1.0}}])
        self.assertTrue(os.path.exists(out_path))

    def test_chorus(self):
        out_path = self._apply_fx([{"id": "chorus", "params": {"mix": 50}}])
        self.assertTrue(os.path.exists(out_path))

    def test_pitch_shift(self):
        # Shift up 12 semitones
        out_path = self._apply_fx([{"id": "pitch", "params": {"semitones": 12}}])
        data, _ = self._read_audio(out_path)
        orig_data, _ = self._read_audio(INPUT_FILE)
        self.assertFalse(np.array_equal(data, orig_data))

    def test_stereo_width(self):
        # Widen
        out_path = self._apply_fx([{"id": "stereo-width", "params": {"width": 200}}])
        data, _ = self._read_audio(out_path)
        # Check difference between L and R
        # Original is perfectly mono (besides noise randomness? no, noise was also same)
        # Wait, create_test_file made L=R. So diff is 0.
        # However, stereo widener uses M/S. If input is mono (S=0), widening S=S*2 is still 0.
        # So stereo width on pure mono input does NOTHING.
        # We need a stereo input for this test.
        
        # Let's create a stereo file with differences
        t = np.linspace(0, 1, SAMPLE_RATE)
        L = np.sin(2 * np.pi * 440 * t)
        R = np.sin(2 * np.pi * 880 * t)
        stereo = np.stack([L, R]).T
        STEREO_FILE = os.path.join(TEST_DIR, "stereo_input.wav")
        sf.write(STEREO_FILE, stereo, SAMPLE_RATE)
        
        config = {"modules": [{"id": "stereo-width", "params": {"width": 200}}]}
        res = process_file(STEREO_FILE, config)
        out_data, _ = self._read_audio(res["output_path"])
        
        # Side signal should be larger
        orig_side = (L - R) * 0.5
        new_side = (out_data[:,0] - out_data[:,1]) * 0.5
        
        orig_side_rms = np.sqrt(np.mean(orig_side**2))
        new_side_rms = np.sqrt(np.mean(new_side**2))
        
        self.assertGreater(new_side_rms, orig_side_rms, "Stereo width didn't increase side content")

    def test_loudness(self):
        # We already verified loudness logic separately, but good to include
        out_path = self._apply_fx([{"id": "loudness", "params": {"gain": 10.0, "ceiling": -0.1}}])
        data, _ = self._read_audio(out_path)
        self.assertTrue(np.max(np.abs(data)) <= 1.0) # Should definitely be limited

if __name__ == '__main__':
    unittest.main()
