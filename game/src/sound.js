// Synthesized sound effects only: small WebAudio oscillator blips, no audio files.
// The context is created on the first user gesture; every call is a no-op until then.
export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContext) return null;
        context = new AudioContext();
      } catch {
        return null;
      }
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone({ freq, endFreq = null, type = 'sine', duration = 0.12, volume = 0.12, delay = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone({ freq: 660, duration: 0.06, volume: 0.08 });
    },
    pickup() {
      tone({ freq: 880, duration: 0.09, volume: 0.1 });
      tone({ freq: 1318, duration: 0.12, volume: 0.1, delay: 0.08 });
    },
    spotted() {
      tone({ freq: 220, endFreq: 440, type: 'sawtooth', duration: 0.28, volume: 0.12 });
    },
    caught() {
      tone({ freq: 330, endFreq: 55, type: 'sawtooth', duration: 0.5, volume: 0.16 });
      tone({ freq: 165, endFreq: 40, type: 'square', duration: 0.5, volume: 0.08, delay: 0.05 });
    },
    level() {
      tone({ freq: 523, duration: 0.12, volume: 0.1 });
      tone({ freq: 659, duration: 0.12, volume: 0.1, delay: 0.11 });
      tone({ freq: 784, duration: 0.2, volume: 0.1, delay: 0.22 });
    },
    win() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => tone({ freq, duration: 0.22, volume: 0.11, delay: i * 0.13 }));
    },
  };
}
