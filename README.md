# Symbolic Multi-Synthesis Audio Engine

A modular Python Digital Signal Processing (DSP) pipeline that parses symbolic music notation (MusicXML, MIDI, ABC) into an event-driven timeline and renders polyphonic audio across multiple synthesis architectures.

## Features
- **Symbolic Event Parser:** Converts musical scores into normalized event dictionaries preserving pitch, onset, duration, dynamics, and articulation.
- **Multi-Synthesis DSP:** Implements a unified `render_voice()` interface supporting:
  - **Subtractive Synthesis:** Band-limited oscillators routed through Butterworth low-pass filters.
  - **FM Synthesis:** Configurable carrier-to-modulator ratios and modulation indices.
  - **Additive Synthesis:** Harmonic partial summation with dynamic amplitude envelopes.
- **Polyphonic Timeline & Mixer:** Sample-accurate scheduling, overlap handling, ADSR click-reduction, and peak normalization.

## Quick Start
```bash
pip install -r requirements.txt
python main.py