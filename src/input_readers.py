from __future__ import annotations

from pathlib import Path

from event_model import MusicalEvent

DEFAULT_DYNAMIC = 0.8
DEFAULT_ARTICULATION = "normal"


def read_with_music21(path: str | Path) -> list[MusicalEvent]:
    """Starter adapter for ABC or MusicXML using music21.

    TODO: Test this function against the supplied files. Extend it if your file
    contains chords, multiple parts, multiple voices, dynamics, or articulations.
    Document any defaults used.
    """
    from music21 import chord, converter, note

    score = converter.parse(str(path))
    events: list[MusicalEvent] = []

    for element in score.flatten().notesAndRests:
        onset = float(element.offset)
        duration = float(element.quarterLength)

        if isinstance(element, note.Rest):
            events.append(
                MusicalEvent("REST", onset, duration, 0.0, DEFAULT_ARTICULATION)
            )
        elif isinstance(element, note.Note):
            dynamic = (
                float(element.volume.velocityScalar)
                if element.volume.velocityScalar is not None
                else DEFAULT_DYNAMIC
            )
            events.append(
                MusicalEvent(
                    element.pitch.nameWithOctave,
                    onset,
                    duration,
                    dynamic,
                    DEFAULT_ARTICULATION,
                )
            )
        elif isinstance(element, chord.Chord):
            # Notes in a chord share onset and duration.
            for pitch in element.pitches:
                events.append(
                    MusicalEvent(
                        pitch.nameWithOctave,
                        onset,
                        duration,
                        DEFAULT_DYNAMIC,
                        DEFAULT_ARTICULATION,
                    )
                )

    if not events:
        raise ValueError(f"No notes or rests were found in {path}")
    return events


def read_midi(path: str | Path) -> list[MusicalEvent]:
    """Template for MIDI conversion using Mido.

    The student must complete note-on/note-off pairing, absolute tick tracking,
    tempo handling, overlapping same-pitch notes, channels, and conversion from
    ticks to quarter-note units. Returning an empty list is intentional.
    """
    from mido import MidiFile

    midi_file = MidiFile(str(path))
    _ticks_per_beat = midi_file.ticks_per_beat

    # TODO:
    # 1. Merge or iterate tracks while tracking absolute tick positions.
    # 2. Pair note_on with note_off (and note_on velocity 0).
    # 3. Maintain active notes by at least (channel, note number).
    # 4. Convert absolute ticks and durations to quarter-note units.
    # 5. Convert note numbers to pitch names or adapt the shared event model.
    # 6. Convert velocity 0..127 to a documented dynamic 0..1.
    # 7. Decide how rests are represented; gaps need not become explicit events.
    raise NotImplementedError("Complete the MIDI event conversion")
