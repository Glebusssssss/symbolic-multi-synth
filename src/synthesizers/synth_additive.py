from __future__ import annotations
from collections.abc import Mapping
import numpy as np
from .base import Synthesizer

class AdditiveSynthesizer(Synthesizer):
    def render_voice(
        self,
        frequency: float,
        gate_duration_seconds: float,
        dynamic: float,
        articulation: str,
        sample_rate: int,
        parameters: Mapping[str, float] | None = None,
    ) -> np.ndarray:
        if parameters is None:
            parameters = {}
            
        # Parameters for additive synthesis (with defaults)
        num_partials = int(parameters.get("num_partials", 4))
        decay_rate = parameters.get("decay_rate", 1.5)
        
        num_samples = int(sample_rate * gate_duration_seconds)
        t = np.linspace(0, gate_duration_seconds, num_samples, endpoint=False)
        
        audio = np.zeros(num_samples)
        
        # Sum harmonics (partials)
        for i in range(1, num_partials + 1):
            partial_freq = frequency * i
            # Amplitude drops off for higher harmonics
            amplitude = (1.0 / (i ** decay_rate))
            partial_wave = amplitude * np.sin(2 * np.pi * partial_freq * t)
            audio += partial_wave
            
        # Normalize partials mix slightly so it doesn't clip before dynamic scaling
        if num_partials > 0:
            audio /= np.max(np.abs(audio)) if np.max(np.abs(audio)) > 0 else 1.0
            
        # Apply simple ADSR / release envelope & dynamic scaling
        envelope = np.linspace(1.0, 0.0, num_samples) # Simple release fade
        audio = audio * dynamic * envelope
        
        return audio.astype(np.float32)