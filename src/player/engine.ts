import { EQ_FREQUENCIES } from "./catalog";
import type { Preferences } from "./types";

export class AudioEngine {
  readonly audio = new Audio();
  context: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private bass: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private spatialDepth: GainNode | null = null;

  constructor() {
    this.audio.preload = "metadata";
    this.audio.crossOrigin = "anonymous";
  }

  async initialize(preferences: Preferences) {
    if (!this.context) {
      this.context = new AudioContext();
      const source = this.context.createMediaElementSource(this.audio);
      let previous: AudioNode = source;
      this.filters = EQ_FREQUENCIES.map((frequency) => {
        const filter = this.context!.createBiquadFilter();
        filter.type =
          frequency === 60
            ? "lowshelf"
            : frequency === 14000
              ? "highshelf"
              : "peaking";
        filter.frequency.value = frequency;
        filter.Q.value = 1;
        previous.connect(filter);
        previous = filter;
        return filter;
      });
      this.bass = this.context.createBiquadFilter();
      this.bass.type = "lowshelf";
      this.bass.frequency.value = 130;
      const panner = this.context.createStereoPanner();
      const oscillator = this.context.createOscillator();
      this.spatialDepth = this.context.createGain();
      oscillator.frequency.value = 0.12;
      oscillator.connect(this.spatialDepth).connect(panner.pan);
      oscillator.start();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.knee.value = 20;
      this.compressor.attack.value = 0.015;
      this.compressor.release.value = 0.25;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gain = this.context.createGain();
      previous
        .connect(this.bass)
        .connect(panner)
        .connect(this.compressor)
        .connect(this.analyser)
        .connect(this.gain)
        .connect(this.context.destination);
    }
    this.apply(preferences);
    if (this.context.state === "suspended") await this.context.resume();
  }

  apply(preferences: Preferences) {
    if (!this.context) {
      this.audio.volume = preferences.volume;
      return;
    }
    this.audio.volume = 1;
    const time = this.context.currentTime;
    this.filters.forEach((filter, index) =>
      filter.gain.setTargetAtTime(
        preferences.eqEnabled ? preferences.eq[index] || 0 : 0,
        time,
        0.06,
      ),
    );
    this.bass?.gain.setTargetAtTime(preferences.bass ? 6 : 0, time, 0.06);
    // Headroom protects against clipping when several EQ bands are boosted.
    const headroom = preferences.eqEnabled || preferences.bass ? 0.62 : 0.9;
    this.gain?.gain.setTargetAtTime(preferences.volume * headroom, time, 0.04);
    this.spatialDepth?.gain.setTargetAtTime(
      preferences.spatial ? 0.38 : 0,
      time,
      0.2,
    );
    this.compressor?.threshold.setTargetAtTime(
      preferences.normalize ? -25 : 0,
      time,
      0.08,
    );
    this.compressor?.ratio.setTargetAtTime(
      preferences.normalize ? 4 : 1,
      time,
      0.08,
    );
  }
}
