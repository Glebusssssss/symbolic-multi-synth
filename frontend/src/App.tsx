import { useState, useRef } from 'react';
import { Play, Square, Download, Sliders, Music } from 'lucide-react';

type Technique = 'subtractive' | 'fm' | 'additive';

interface NoteEvent {
  pitch: string;
  onsetBeats: number;
  durationBeats: number;
  dynamic: number;
}

const SAMPLE_MELODY: NoteEvent[] = [
  { pitch: 'C4', onsetBeats: 0, durationBeats: 1, dynamic: 0.8 },
  { pitch: 'E4', onsetBeats: 1, durationBeats: 1, dynamic: 0.8 },
  { pitch: 'G4', onsetBeats: 2, durationBeats: 1, dynamic: 0.85 },
  { pitch: 'B4', onsetBeats: 3, durationBeats: 1.5, dynamic: 0.9 },
  { pitch: 'C5', onsetBeats: 4.5, durationBeats: 1.5, dynamic: 0.95 },
  { pitch: 'G4', onsetBeats: 6, durationBeats: 1, dynamic: 0.75 },
  { pitch: 'E4', onsetBeats: 7, durationBeats: 1, dynamic: 0.75 },
  { pitch: 'C4', onsetBeats: 8, durationBeats: 2, dynamic: 0.85 },
];

function pitchToFreq(pitch: string): number {
  const notes: Record<string, number> = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
    'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
  };
  const match = pitch.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 440;
  const midi = 12 * (parseInt(match[2], 10) + 1) + notes[match[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function App() {
  const [technique, setTechnique] = useState<Technique>('subtractive');
  const [tempo, setTempo] = useState(120);
  const [cutoff, setCutoff] = useState(1400);
  const [modIndex, setModIndex] = useState(4.0);
  const [modRatio, setModRatio] = useState(2.0);
  const [partialsCount, setPartialsCount] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wavUrl, setWavUrl] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const renderTimelineBuffer = (): AudioBuffer => {
    const sampleRate = 44100;
    const secPerBeat = 60 / tempo;
    const totalDuration = 10 * secPerBeat + 1.0;
    const totalSamples = Math.floor(totalDuration * sampleRate);
    const mix = new Float32Array(totalSamples);

    for (const ev of SAMPLE_MELODY) {
      const freq = pitchToFreq(ev.pitch);
      const durSec = ev.durationBeats * secPerBeat;
      const onsetSample = Math.floor(ev.onsetBeats * secPerBeat * sampleRate);
      const numSamples = Math.floor(durSec * sampleRate);
      const voice = new Float32Array(numSamples);

      let lpState = 0;
      const dt = 1 / sampleRate;
      const rc = 1 / (2 * Math.PI * cutoff);
      const alpha = dt / (rc + dt);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        if (technique === 'subtractive') {
          const saw = 2 * (t * freq - Math.floor(0.5 + t * freq));
          lpState = lpState + alpha * (saw - lpState);
          sample = lpState;
        } else if (technique === 'fm') {
          const modulator = modIndex * Math.sin(2 * Math.PI * (freq * modRatio) * t);
          sample = Math.sin(2 * Math.PI * freq * t + modulator);
        } else if (technique === 'additive') {
          for (let p = 1; p <= partialsCount; p++) {
            sample += (1 / p) * Math.sin(2 * Math.PI * (freq * p) * t);
          }
        }

        const att = Math.min(1, i / (0.015 * sampleRate));
        const rel = Math.min(1, (numSamples - i) / (0.05 * sampleRate));
        voice[i] = sample * ev.dynamic * att * rel;
      }

      for (let i = 0; i < numSamples && onsetSample + i < totalSamples; i++) {
        mix[onsetSample + i] += voice[i];
      }
    }

    let peak = 0;
    for (let i = 0; i < totalSamples; i++) {
      if (Math.abs(mix[i]) > peak) peak = Math.abs(mix[i]);
    }
    if (peak > 0.95) {
      for (let i = 0; i < totalSamples; i++) mix[i] = (mix[i] / peak) * 0.95;
    }

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    buffer.copyToChannel(mix, 0);
    generateWavDownload(mix, sampleRate);
    return buffer;
  };

  const generateWavDownload = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const blob = new Blob([view], { type: 'audio/wav' });
    setWavUrl(URL.createObjectURL(blob));
  };

  const handlePlay = () => {
    if (audioCtxRef.current) audioCtxRef.current.close();
    const buffer = renderTimelineBuffer();
    const source = audioCtxRef.current!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current!.destination);
    setIsPlaying(true);
    source.onended = () => setIsPlaying(false);
    source.start();
  };

  const handleStop = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-400" />
              Symbolic Multi-Synthesis Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1">Interactive DSP Timeline & WAV Renderer</p>
          </div>
          <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full">
            44.1 kHz / 16-bit
          </span>
        </div>

        {/* Technique Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Synthesis Architecture
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['subtractive', 'fm', 'additive'] as Technique[]).map((t) => (
              <button
                key={t}
                onClick={() => setTechnique(t)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium capitalize transition ${
                  technique === t
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Parameter Controls */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Sliders className="w-4 h-4 text-indigo-400" />
            DSP Parameters
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Tempo</span>
              <span className="text-indigo-400 font-mono">{tempo} BPM</span>
            </div>
            <input
              type="range"
              min="60"
              max="180"
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {technique === 'subtractive' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Low-Pass Filter Cutoff</span>
                <span className="text-indigo-400 font-mono">{cutoff} Hz</span>
              </div>
              <input
                type="range"
                min="200"
                max="5000"
                step="50"
                value={cutoff}
                onChange={(e) => setCutoff(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          )}

          {technique === 'fm' && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Modulation Index</span>
                  <span className="text-indigo-400 font-mono">{modIndex.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={modIndex}
                  onChange={(e) => setModIndex(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Modulator Ratio</span>
                  <span className="text-indigo-400 font-mono">{modRatio.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={modRatio}
                  onChange={(e) => setModRatio(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </>
          )}

          {technique === 'additive' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Harmonic Partials</span>
                <span className="text-indigo-400 font-mono">{partialsCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={partialsCount}
                onChange={(e) => setPartialsCount(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Transport & WAV Export */}
        <div className="flex items-center gap-3 pt-2">
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" /> Render & Play
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Square className="w-4 h-4 fill-current" /> Stop
            </button>
          )}

          {wavUrl && (
            <a
              href={wavUrl}
              download={`synth_${technique}.wav`}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-xl flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> WAV
            </a>
          )}
        </div>
      </div>
    </div>
  );
}