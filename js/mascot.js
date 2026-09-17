/**
 * CompilerG - "Dex" Pixel Mascot Companion
 * An interactive, animated pixel dragon companion that reacts to code execution,
 * celebrates victories, sweats on errors, and offers motivational tips.
 */

class MascotDex {
    constructor(containerId = 'mascotWidget') {
        this.container = document.getElementById(containerId);
        this.state = 'idle'; // 'idle', 'thinking', 'success', 'error'
        this.tips = [
            "Remember to check your indentations, adventurer!",
            "Did you know? Python was named after Monty Python, not the snake!",
            "Stuck on an error? Ask Master Turing with the AI Mentor button!",
            "Every master was once an apprentice who refused to give up.",
            "Test early, test often! Small spells are easier to master.",
            "Syntax errors are just your compiler asking for clarity.",
            "Take a deep breath and conquer the next quest! ⚔️"
        ];
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        this.bindEvents();
    }

    setState(newState, customMessage = null) {
        this.state = newState;
        const mascotEl = document.getElementById('dexCharacter');
        const speechBubble = document.getElementById('dexSpeechBubble');

        if (mascotEl) {
            mascotEl.className = `dex-mascot ${newState}`;
        }

        if (speechBubble) {
            if (customMessage) {
                speechBubble.textContent = customMessage;
                speechBubble.style.opacity = '1';
            } else if (newState === 'success') {
                speechBubble.textContent = '🎉 Spell Cast Successfully! +XP!';
                speechBubble.style.opacity = '1';
                setTimeout(() => { this.resetToIdle(); }, 4000);
            } else if (newState === 'error') {
                speechBubble.textContent = '💥 Ouch! A glitch appeared! Tap "Instant Fix"!';
                speechBubble.style.opacity = '1';
            } else if (newState === 'thinking') {
                speechBubble.textContent = '🔮 Divining the output...';
                speechBubble.style.opacity = '1';
            } else {
                speechBubble.style.opacity = '0';
            }
        }
    }

    resetToIdle() {
        if (this.state === 'success' || this.state === 'thinking') {
            this.setState('idle');
        }
    }

    showRandomTip() {
        const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
        const speechBubble = document.getElementById('dexSpeechBubble');
        if (speechBubble) {
            speechBubble.textContent = `💡 ${tip}`;
            speechBubble.style.opacity = '1';
            setTimeout(() => {
                if (this.state === 'idle') speechBubble.style.opacity = '0';
            }, 5000);
        }
    }

    bindEvents() {
        const mascotEl = document.getElementById('dexCharacter');
        if (mascotEl) {
            mascotEl.addEventListener('click', () => {
                this.showRandomTip();
                mascotEl.classList.add('bounce');
                setTimeout(() => mascotEl.classList.remove('bounce'), 600);
            });
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="dex-companion-wrap" title="Click Dex for coding tips!">
                <div id="dexSpeechBubble" class="dex-speech-bubble" style="opacity: 0;">Hi Adventurer! Click me for tips!</div>
                <div id="dexCharacter" class="dex-mascot idle">
                    <div class="dex-horns"></div>
                    <div class="dex-head">
                        <div class="dex-eyes">
                            <span class="dex-eye left"></span>
                            <span class="dex-eye right"></span>
                        </div>
                        <div class="dex-blush left"></div>
                        <div class="dex-blush right"></div>
                        <div class="dex-mouth"></div>
                    </div>
                    <div class="dex-wings">
                        <span class="dex-wing left"></span>
                        <span class="dex-wing right"></span>
                    </div>
                    <div class="dex-body"></div>
                    <div class="dex-tail"></div>
                    <div class="dex-fx"></div>
                </div>
            </div>
        `;
    }
}

if (typeof window !== 'undefined') {
    window.MascotDex = MascotDex;
}
if (typeof module !== 'undefined') {
    module.exports = MascotDex;
}
