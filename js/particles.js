/**
 * CompilerG - Interactive Particle Starfield & Dynamic Cosmic Background
 * Ported from John-T45 (https://github.com/John-T45/John-T45.github.io.git):
 * - Atmospheric floating stardust particles via Particles.js
 * - Interactive WebGL Shooting Star bursts on code execution & cursor move
 */

function initParticleStarfield() {
    if (typeof Particles !== 'undefined') {
        const bgEl = document.querySelector('.background');
        if (bgEl) {
            try {
                Particles.init({
                    selector: '.background',
                    color: ['#faebd7', '#ffffff', 'burlywood', '#ffd43f'],
                    connectParticles: false,
                    maxParticles: 75,
                    sizeVariations: 3,
                    speed: 0.35,
                    responsive: [
                        {
                            breakpoint: 768,
                            options: {
                                maxParticles: 38,
                                color: ['#faebd7', '#ffffff', 'burlywood'],
                                connectParticles: false
                            }
                        }
                    ]
                });
            } catch (err) {
                console.warn('Particles.init notice:', err);
            }
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticleStarfield);
} else {
    initParticleStarfield();
}

/**
 * Backward-compatible BackgroundCanvas adapter
 */
class BackgroundCanvas {
    constructor(canvasId = 'bgCanvas') {
        this.isActive = true;
        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    }

    burst() {
        // Trigger celebratory WebGL shooting stars across the canvas when code executes!
        if (typeof window.triggerShootingStar === 'function') {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    const rx = (Math.random() - 0.5) * (window.innerWidth || 800);
                    const ry = (Math.random() - 0.5) * (window.innerHeight || 600);
                    window.triggerShootingStar(rx, ry);
                }, i * 120);
            }
        }
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
    }

    destroy() {
        this.isActive = false;
    }
}

window.BackgroundCanvas = BackgroundCanvas;
