
import unittest
import numpy as np
import soundfile as sf
import os
import shutil
import json
import logging
from apply_fx import process_file

# Setup
TEST_DIR = "test_restoration_output"
INPUT_FILE = os.path.join(TEST_DIR, "test_input.wav")
SAMPLE_RATE = 44100
DURATION = 2.0 

def create_test_file():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    os.makedirs(TEST_DIR)
    
    # Create white noise
    audio = np.random.normal(0, 0.5, (int(SAMPLE_RATE * DURATION), 2))
    
    sf.write(INPUT_FILE, audio, SAMPLE_RATE)
    return INPUT_FILE

class TestRestoration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        create_test_file()
        logging.getLogger('apply_fx').setLevel(logging.INFO) # Enable logging to see our new logs

    def _apply_fx(self, modules):
        config = {"modules": modules}
        result = process_file(INPUT_FILE, config)
        if result.get("status") == "error":
            self.fail(f"FX Processing failed: {result.get('message')}")
        return result["output_path"]

    def test_dereverb(self):
        print("\nTesting De-Reverb...")
        out_path = self._apply_fx([{"id": "dereverb", "params": {"amount": 50, "threshold": -30}}])
        self.assertTrue(os.path.exists(out_path))

    def test_deesser(self):
        print("\nTesting De-Esser...")
        out_path = self._apply_fx([{"id": "deesser", "params": {"threshold": -20, "frequency": 7000}}])
        self.assertTrue(os.path.exists(out_path))

if __name__ == '__main__':
    unittest.main()
