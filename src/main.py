from __future__ import annotations
from pathlib import Path

from audio_output import save_wav
from config import AudioConfig
from input_readers import read_with_music21
from timeline import render_timeline
from synthesizers.synth_additive import AdditiveSynthesizer
from synthesizers.synth_fm import FMSynthesizer
from synthesizers.synth_subtractive import SubtractiveSynthesizer


def main() -> None:
    config = AudioConfig(sample_rate=44_100, tempo_bpm=100.0)

    # 1. Locate and parse your symbolic MusicXML input file
    project_root = Path(__file__).resolve().parent.parent
    input_path = project_root / "input" / "cs322_simple_melody.musicxml"
    
    events = read_with_music21(input_path)
    print(f"Successfully parsed {len(events)} events from {input_path.name}")

    # 2. Set up output directory
    output_dir = project_root / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 3. Define your three custom synthesizers
    synthesizers = {
        "additive": AdditiveSynthesizer(),
        "fm": FMSynthesizer(),
        "subtractive": SubtractiveSynthesizer(),
    }

    # 4. Render and export WAV files for each technique
    for name, synth in synthesizers.items():
        audio = render_timeline(
            events=events,
            synthesizer=synth,
            config=config,
        )

        output_file = output_dir / f"melody_{name}.wav"
        save_wav(str(output_file), audio, config.sample_rate)
        print(f"Saved: {output_file}")


if __name__ == "__main__":
    main()