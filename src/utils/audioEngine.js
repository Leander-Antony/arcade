class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
  }

  init() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.15; // Global volume
      this.masterGain.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playOscillator(type, freq, duration, slideFreq = null) {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, this.audioCtx.currentTime + duration);
    }

    gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  playHoverBeep() {
    this.playOscillator('sine', 880, 0.1); // A5
  }

  playCoinInsert() {
    this.playOscillator('square', 987.77, 0.1, 1318.51); // B5 to E6
    setTimeout(() => {
      this.playOscillator('square', 1318.51, 0.4);
    }, 100);
  }

  playGameStart() {
    // Quick arpeggio
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playOscillator('square', freq, 0.15);
      }, i * 100);
    });
  }

  playBootUp() {
    this.playOscillator('sawtooth', 110, 1.5, 440); // A2 sliding up to A4
  }

  playGameOver() {
    // Cheerful ascending arpeggio
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playOscillator('sine', freq, 0.3);
      }, i * 150);
    });
  }
}

export const audioEngine = new AudioEngine();
