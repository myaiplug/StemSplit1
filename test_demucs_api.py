#!/usr/bin/env python
"""Test Demucs API to discover correct usage"""

from demucs.pretrained import get_model
from demucs.apply import apply_model
import torch

model = get_model('htdemucs')
print(f'Model type: {type(model).__name__}')
print(f'Model sources: {model.sources}')
print(f'Model samplerate: {model.samplerate}')

# Create test waveform
waveform = torch.randn(2, 44100)  # 2 channels, 1 second @ 44.1kHz
print(f'\nInput shape: {waveform.shape}')

# Use apply_model as suggested by the error
with torch.no_grad():
    output = apply_model(model, waveform[None])  # add batch dimension
print(f'Output shape: {output.shape}')
# Output is [batch=1, sources=4, channels=2, samples=44100]

# Extract stems
stems = {}
for i, stem_name in enumerate(model.sources):
    stem_audio = output[0, i]  # batch 0, source i, all channels, all samples
    stems[stem_name] = stem_audio.numpy()
    print(f'{stem_name}: shape {stems[stem_name].shape}')

print('\n✓ API test successful - use apply_model() for separation')

