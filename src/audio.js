// Procedural Audio Engine using Web Audio API
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicInterval = null;
    this.isPlayingMusic = false;
    
    // Synthwave sequencer settings
    this.tempo = 120;
    this.currentStep = 0;
    this.notes = [110, 110, 130, 110, 146, 146, 130, 110]; // A2, C3, D3, etc. base bassline
    this.melodyPattern = [
      440, 0, 493, 523, 0, 587, 0, 523,
      440, 440, 493, 523, 587, 659, 587, 523
    ]; // Simple arpeggio
  }

  init() {
    if (this.ctx) return;
    // Initialize audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  // SFX: Coin Collection (Chime)
  playCoinSFX() {
    if (!this.sfxEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    
    // First high note
    this.playTone(987.77, 'sine', 0.08, 0.05, t); // B5
    // Second higher note shortly after
    this.playTone(1318.51, 'sine', 0.12, 0.05, t + 0.06); // E6
  }

  // SFX: Jump (Whoosh up)
  playJumpSFX() {
    if (!this.sfxEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'triangle';
    const t = this.ctx.currentTime;
    
    // Sweep pitch up from 180Hz to 600Hz
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    
    gainNode.gain.setValueAtTime(0.2, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // SFX: Slide (Friction sweep down)
  playSlideSFX() {
    if (!this.sfxEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    
    const t = this.ctx.currentTime;
    
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.25);
    
    gainNode.gain.setValueAtTime(0.15, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // SFX: Crash (Explosion)
  playCrashSFX() {
    if (!this.sfxEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with random noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.35);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    noiseNode.start();
  }

  get currentTime() {
    this.init();
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Helper to play a simple synth note
  playTone(freq, type, duration, volume, time) {
    this.init();
    const playTime = time !== undefined ? time : (this.ctx ? this.ctx.currentTime : 0);
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, playTime);
    
    gainNode.gain.setValueAtTime(volume, playTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, playTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(playTime);
    osc.stop(playTime + duration);
  }

  // Looping background music track
  startMusic() {
    if (!this.musicEnabled || this.isPlayingMusic) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.isPlayingMusic = true;
    this.currentStep = 0;
    
    const stepDuration = 60 / this.tempo / 2; // Eighth notes
    
    const playSequencerStep = () => {
      if (!this.isPlayingMusic) return;
      
      const t = this.ctx.currentTime;
      
      // 1. Play Pulsing Bassline (every 8th note)
      const bassNote = this.notes[this.currentStep % this.notes.length];
      this.playTone(bassNote, 'sawtooth', stepDuration * 0.9, 0.05, t);
      
      // 2. Play Melodic Arpeggio (every 8th note)
      const melFreq = this.melodyPattern[this.currentStep % this.melodyPattern.length];
      if (melFreq > 0) {
        // High-pass styled neon lead
        this.playNeonLead(melFreq, stepDuration * 0.8, 0.02, t);
      }
      
      this.currentStep++;
      // Schedule next step
      this.musicInterval = setTimeout(playSequencerStep, stepDuration * 1000);
    };
    
    playSequencerStep();
  }

  playNeonLead(freq, duration, volume, time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    // Add brief pitch vibrato for retro synth character
    osc.frequency.linearRampToValueAtTime(freq + 4, time + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(freq, time + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.Q.setValueAtTime(1.0, time);
    
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + duration);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audio = new AudioEngine();
