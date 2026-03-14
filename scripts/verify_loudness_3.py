import numpy as np
from pedalboard import Pedalboard, Limiter, Gain

sr = 44100
t = np.linspace(0, 1, sr)
audio = 0.5 * np.sin(2 * np.pi * 440 * t) # Peak 0.5 (-6dB)

print(f"Original: {np.max(np.abs(audio)):.4f}")

# Test Limiter Threshold -20dB (0.1)
board = Pedalboard([Limiter(threshold_db=-20.0)])
out = board(audio, sr)
print(f"Limiter (-20dB): {np.max(np.abs(out)):.4f}")

# Test Limiter Threshold -3dB (0.707)
board = Pedalboard([Limiter(threshold_db=-3.0)])
out = board(audio, sr)
print(f"Limiter (-3dB): {np.max(np.abs(out)):.4f}")
