/**
 * CompilerG - 8-Bit Retro Sound Synthesis Engine
 * Generates authentic chiptune retro sounds in real-time using the Web Audio API.
 * 100% self-contained with ZERO external audio file dependencies.
 */

class SoundFX {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('compilerg_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('compilerg_muted', this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    /**
     * Mechanical 8-bit button click
     */
    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.04);
        } catch (e) { }
    }

    /**
     * Cheerful dual-tone chime when code compiles and runs successfully
     */
    playSuccess() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) { }
    }

    /**
     * Ascending 4-tone arpeggio when earning XP
     */
    playXpGain() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;

                const start = now + idx * 0.06;
                gain.gain.setValueAtTime(0.1, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(start);
                osc.stop(start + 0.09);
            });
        } catch (e) { }
    }

    /**
     * Triumphant 8-bit fanfare when player levels up!
     */
    playLevelUp() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // Fanfare notes: C5, E5, G5, B5, C6 (extended triumph)
            const fanfare = [
                { f: 523.25, d: 0.1 },
                { f: 659.25, d: 0.1 },
                { f: 783.99, d: 0.1 },
                { f: 987.77, d: 0.12 },
                { f: 1046.50, d: 0.4 }
            ];

            let curTime = now;
            fanfare.forEach(item => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(item.f, curTime);

                gain.gain.setValueAtTime(0.18, curTime);
                gain.gain.exponentialRampToValueAtTime(0.001, curTime + item.d);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(curTime);
                osc.stop(curTime + item.d);
                curTime += item.d;
            });
        } catch (e) { }
    }

    /**
     * Retro arcade "ouch/hit" buzzer when execution fails
     */
    playError() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.22);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) { }
    }

    /**
     * Quest victory chime
     */
    playQuestComplete() {
        if (this.muted) return;
        this.playLevelUp();
    }
}

if (typeof window !== 'undefined') {
    window.SoundFX = SoundFX;
    window.soundFX = new SoundFX();
}
if (typeof module !== 'undefined') {
    module.exports = SoundFX;
}
