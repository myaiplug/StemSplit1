import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, Limiter, Gain

sr = 44100
t = np.linspace(0, 1, sr)
# Create a quiet sine wave
audio = 0.1 * np.sin(2 * np.pi * 440 * t) # Peak -20dB

board = Pedalboard()
board.append(Gain(gain_db=0))
board.append(Limiter(threshold_db=-0.1))

# Process
processed = board(audio, sr)
print(f"Original Peak: {np.max(np.abs(audio)):.4f}")
print(f"Processed Peak (Gain=0): {np.max(np.abs(processed)):.4f}")

# Now add gain
board = Pedalboard()
board.append(Gain(gain_db=10)) # Boost 10dB => Peak -10dB
board.append(Limiter(threshold_db=-0.1))
processed = board(audio, sr)
print(f"Processed Peak (Gain=10): {np.max(np.abs(processed)):.4f}")

# Now maximize
board = Pedalboard()
board.append(Gain(gain_db=20)) # Boost 20dB => Peak 0dB
board.append(Limiter(threshold_db=-0.1))
processed = board(audio, sr)
print(f"Processed Peak (Gain=20): {np.max(np.abs(processed)):.4f}")
