from __future__ import annotations

from collections.abc import Mapping

import numpy as np

from .base import Synthesizer


class FMSynthesizer(Synthesizer):
    """FM Synthesis implementation using a carrier-modulator pair."""

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

        # FM parameters with defaults (matching assignment suggestions)
        c_m_ratio = parameters.get("c_m_ratio", 1.0)
        modulation_index = parameters.get("modulation_index", 3.0)

        num_samples = int(sample_rate * gate_duration_seconds)
        t = np.linspace(0, gate_duration_seconds, num_samples, endpoint=False)

        carrier_freq = frequency
        modulator_freq = frequency * c_m_ratio

        # FM synthesis math formula
        modulator = modulation_index * np.sin(2 * np.pi * modulator_freq * t)
        carrier = np.sin(2 * np.pi * carrier_freq * t + modulator)

        # Apply simple release envelope and dynamic scaling
        envelope = np.linspace(1.0, 0.0, num_samples)
        audio = carrier * dynamic * envelope

        return audio.astype(np.float32)