import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, Limiter, Gain

sr = 44100
t = np.linspace(0, 1, sr)
audio = 0.1 * np.sin(2 * np.pi * 440 * t) # Peak 0.1

print(f"Original: {np.max(np.abs(audio)):.4f}")

# Test Gain 0 only
board = Pedalboard([Gain(gain_db=0)])
out = board(audio, sr)
print(f"Gain 0 only: {np.max(np.abs(out)):.4f}")

# Test Limiter only (-0.1dB)
board = Pedalboard([Limiter(threshold_db=-0.1)])
out = board(audio, sr)
print(f"Limiter only (-0.1dB): {np.max(np.abs(out)):.4f}")

# Test standard chain
board = Pedalboard()
board.append(Gain(gain_db=0))
board.append(Limiter(threshold_db=-0.1))
out = board(audio, sr)
print(f"Chain (Gain 0 + Limiter): {np.max(np.abs(out)):.4f}")
