import type { Track } from "./types";

interface Score {
  bpm: number;
  root: number;
  seed: number;
}
const SCORES: Record<string, Score> = {
  raat: { bpm: 76, root: 48, seed: 7 },
  blossom: { bpm: 82, root: 53, seed: 13 },
  lost: { bpm: 72, root: 50, seed: 23 },
  numb: { bpm: 86, root: 45, seed: 31 },
  kahani: { bpm: 78, root: 55, seed: 43 },
  silent: { bpm: 70, root: 48, seed: 53 },
  moonlight: { bpm: 88, root: 52, seed: 61 },
  sakura: { bpm: 80, root: 57, seed: 71 },
};
const rendered = new Map<string, Promise<string>>();
const SAMPLE_RATE = 22050;

function encodeWave(
  buffer: AudioBuffer,
  loopDuration: number,
  duration: number,
): Blob {
  const samples = buffer.getChannelData(0);
  const length = Math.ceil(duration * buffer.sampleRate);
  const loopLength = Math.round(loopDuration * buffer.sampleRate);
  const musicLength = loopLength * 4;
  const tailLength = samples.length - loopLength;
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++)
      view.setUint8(offset + index, value.charCodeAt(index));
  };
  text(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * 2, true);
  for (let index = 0; index < length; index++) {
    const position = index % loopLength;
    let value =
      index < musicLength
        ? samples[position]
        : samples[loopLength + index - musicLength] || 0;
    if (index >= loopLength && index < musicLength && position < tailLength)
      value += samples[loopLength + position];
    const fade = Math.min(
      1,
      index / (buffer.sampleRate * 0.3),
      (length - index) / (buffer.sampleRate * 3),
    );
    const sample = Math.max(-0.98, Math.min(0.98, value * fade));
    view.setInt16(44 + index * 2, sample * 32767, true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

async function renderScore(score: Score): Promise<string> {
  const beat = 60 / score.bpm;
  const duration = beat * 128 + 4;
  const loopDuration = beat * 32;
  // Render an eight-bar phrase once, preserving the reverb tail at loop joins.
  const context = new OfflineAudioContext(
    1,
    Math.ceil((loopDuration + 4) * SAMPLE_RATE),
    SAMPLE_RATE,
  );
  const master = context.createGain();
  master.gain.value = 0.7;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.ratio.value = 3;
  master.connect(compressor).connect(context.destination);
  const delay = context.createDelay(2);
  delay.delayTime.value = beat * 0.75;
  const echo = context.createGain();
  echo.gain.value = 0.17;
  delay.connect(echo).connect(master);

  let seed = score.seed;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const noise = context.createBuffer(1, SAMPLE_RATE, SAMPLE_RATE);
  const noiseData = noise.getChannelData(0);
  for (let index = 0; index < noiseData.length; index++)
    noiseData[index] = random() * 2 - 1;

  function note(
    midi: number,
    when: number,
    length: number,
    volume: number,
    kind: "keys" | "pad" | "bass" = "keys",
  ) {
    const oscillator = context.createOscillator();
    oscillator.type = kind === "pad" ? "triangle" : "sine";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(
      volume,
      when + (kind === "pad" ? 0.25 : 0.012),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
    oscillator.connect(envelope).connect(master);
    if (kind === "keys") envelope.connect(delay);
    oscillator.start(when);
    oscillator.stop(when + length + 0.02);
    if (kind === "keys") {
      const overtone = context.createOscillator();
      overtone.frequency.value = oscillator.frequency.value * 2;
      const shimmer = context.createGain();
      shimmer.gain.setValueAtTime(volume * 0.16, when);
      shimmer.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
      overtone.connect(shimmer).connect(master);
      overtone.start(when);
      overtone.stop(when + 0.51);
    }
  }

  function percussion(when: number, kind: "kick" | "snare" | "hat") {
    const envelope = context.createGain();
    const length = kind === "kick" ? 0.25 : kind === "snare" ? 0.13 : 0.055;
    envelope.gain.setValueAtTime(
      kind === "kick" ? 0.24 : kind === "snare" ? 0.065 : 0.018,
      when,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
    envelope.connect(master);
    if (kind === "kick") {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(135, when);
      oscillator.frequency.exponentialRampToValueAtTime(43, when + 0.13);
      oscillator.connect(envelope);
      oscillator.start(when);
      oscillator.stop(when + length);
    } else {
      const source = context.createBufferSource();
      source.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = kind === "hat" ? "highpass" : "bandpass";
      filter.frequency.value = kind === "hat" ? 6000 : 1700;
      filter.Q.value = 0.8;
      source.connect(filter).connect(envelope);
      source.start(when, random() * 0.7, length);
    }
  }

  const chords = [
    [0, 3, 7, 10],
    [5, 8, 12, 15],
    [8, 12, 15, 19],
    [3, 7, 10, 14],
  ];
  const melody = [7, 10, 14, 12, 10, 7, 5, 3, 7, 10, 15, 14, 12, 10, 7, 3];
  for (let bar = 0; bar < 8; bar++) {
    const start = bar * beat * 4;
    const chord = chords[Math.floor(bar / 2) % 4];
    chord.forEach((pitch, index) => {
      note(score.root + pitch, start, beat * 4, 0.028, "pad");
      note(score.root + 12 + pitch, start + index * 0.024, beat * 2.5, 0.065);
    });
    for (let step = 0; step < 4; step++) {
      note(
        score.root - 12 + chord[0],
        start + step * beat,
        beat * 0.82,
        0.11,
        "bass",
      );
      if (bar > 1 && random() > 0.17) {
        const pitch = melody[(bar * 2 + step + score.seed) % melody.length];
        note(
          score.root + 24 + pitch,
          start + beat * (step + 0.16),
          beat * 1.5,
          0.045,
        );
      }
    }
    if (bar < 30) {
      [0, 2].forEach((step) => percussion(start + step * beat, "kick"));
      [1, 3].forEach((step) =>
        percussion(start + step * beat + 0.012, "snare"),
      );
      for (let step = 0; step < 8; step++)
        percussion(start + step * beat * 0.5 + (step % 2) * 0.025, "hat");
    }
  }
  const audio = await context.startRendering();
  return URL.createObjectURL(encodeWave(audio, loopDuration, duration));
}

// Scores live in source code, so a fresh ZIP or Git clone needs no generated MP3s.
export function resolveTrackSource(track: Track): Promise<string> {
  if (!track.src.startsWith("demo:")) return Promise.resolve(track.src);
  const id = track.src.slice(5);
  const score = SCORES[id];
  if (!score) return Promise.reject(new Error("Unknown instrumental score"));
  if (!rendered.has(id)) {
    rendered.set(
      id,
      renderScore(score).catch((error: unknown) => {
        rendered.delete(id);
        throw error;
      }),
    );
  }
  return rendered.get(id)!;
}
