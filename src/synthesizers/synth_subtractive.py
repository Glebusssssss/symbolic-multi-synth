from __future__ import annotations

from collections.abc import Mapping

import numpy as np

from .base import Synthesizer


class SubtractiveSynthesizer(Synthesizer):
    """Subtractive Synthesis implementation using a sawtooth wave and a simple low-pass filter approximation."""

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

        # Subtractive parameters with defaults
        cutoff = parameters.get("cutoff", 1500.0)

        num_samples = int(sample_rate * gate_duration_seconds)
        t = np.linspace(0, gate_duration_seconds, num_samples, endpoint=False)

        # Generate a rich sawtooth wave using additive approximation (summing sines)
        audio = np.zeros(num_samples)
        max_harmonic = int(sample_rate / (2 * frequency))
        max_harmonic = min(max_harmonic, 20)  # limit for performance
        
        for i in range(1, max_harmonic + 1):
            # Simple high-frequency attenuation simulating a low-pass filter
            if (i * frequency) < cutoff:
                audio += (1.0 / i) * np.sin(2 * np.pi * i * frequency * t)

        if max_harmonic > 0 and np.max(np.abs(audio)) > 0:
            audio /= np.max(np.abs(audio))

        # Apply simple release envelope and dynamic scaling
        envelope = np.linspace(1.0, 0.0, num_samples)
        audio = audio * dynamic * envelope

        return audio.astype(np.float32)