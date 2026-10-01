// Haute Horlogerie 4Hz (28,800 vph) Mechanical Escapement Sound Generator
// Synthesized via Web Audio API (zero audio file assets required)

class EscapementAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.intervalId = null;
    this.tickCount = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTick(isTock = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Metallic pallet jewel ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Pallet entry jewel vs exit jewel micro-pitch variance (4200Hz vs 4800Hz)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isTock ? 4400 : 4900, now);
    osc.frequency.exponentialRampToValueAtTime(isTock ? 1200 : 1500, now + 0.012);

    // Bandpass filter for crisp mechanical timbre
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isTock ? 3800 : 4200, now);
    filter.Q.setValueAtTime(8, now);

    // Subtle volume envelope (very delicate, luxury quiet watch feel)
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);

    // Mechanical wheel spring decay (subtle low-end click)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isTock ? 420 : 540, now);
    subOsc.frequency.exponentialRampToValueAtTime(80, now + 0.008);

    subGain.gain.setValueAtTime(0.02, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.012);
  }

  start() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    // 28,800 VPH = 8 beats per second (every 125ms)
    this.intervalId = setInterval(() => {
      this.tickCount++;
      const isTock = this.tickCount % 2 === 0;
      this.playTick(isTock);
    }, 125);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }
}

export const escapementAudio = new EscapementAudio();
