class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.ambienceStarted = false;
  }

  init() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.15; // Global volume
      
      // Add a compressor to prevent audio clipping/distortion when many sounds play at once
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.audioCtx.destination);
      
      const startAmbience = () => {
        if (!this.ambienceStarted && this.audioCtx.state === 'running') {
          this.playArcadeAmbience();
          this.ambienceStarted = true;
          window.removeEventListener('click', startAmbience);
          window.removeEventListener('keydown', startAmbience);
        }
      };
      window.addEventListener('click', startAmbience);
      window.addEventListener('keydown', startAmbience);
      
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  playArcadeAmbience() {
    if (!this.audioCtx) return;
    
    // Electrical cabinet buzzing hum (Sawtooth + LowPass Filter)
    const humOsc = this.audioCtx.createOscillator();
    humOsc.type = 'sawtooth';
    humOsc.frequency.value = 60; // 60Hz AC mains electrical hum
    
    // Filter to muffle the harshness of the sawtooth so it sounds like it's inside a cabinet
    const humFilter = this.audioCtx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 400; 
    
    const humGain = this.audioCtx.createGain();
    humGain.gain.value = 0.04; // Adjust volume for the buzz
    
    humOsc.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(this.masterGain);
    humOsc.start();
    
    // Distant arcade chatter/beeps simulation loop
    const playRandomBeep = () => {
      if (!this.audioCtx) return;
      const beepOsc = this.audioCtx.createOscillator();
      beepOsc.type = ['square', 'sawtooth'][Math.floor(Math.random() * 2)];
      beepOsc.frequency.value = 200 + Math.random() * 800;
      
      const beepGain = this.audioCtx.createGain();
      beepGain.gain.value = 0.005 + Math.random() * 0.01; // Very quiet
      beepGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
      
      beepOsc.connect(beepGain);
      beepGain.connect(this.masterGain);
      
      beepOsc.start();
      beepOsc.stop(this.audioCtx.currentTime + 0.1);
      
      beepOsc.onended = () => {
        beepOsc.disconnect();
        beepGain.disconnect();
      };
      
      setTimeout(playRandomBeep, 2000 + Math.random() * 5000);
    };
    playRandomBeep();
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

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playHoverBeep() {
    this.playOscillator('square', 880, 0.1, 440); // Punchier square wave hover
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
