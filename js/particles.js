/**
 * CompilerG - High-Performance Celestial Shooting Star & Cosmic Meteor Stream
 * 
 * Silky-smooth 60+ FPS full-page cosmic background engine.
 * Features:
 * - Full-page continuous streaming meteors & shooting stars
 * - 3-tier depth (Distant micro-streaks, radiant meteors, and majestic super-bolides)
 * - Ethereal linear-gradient glowing tails with stardust embers
 * - Ambient twinkling constellation starfield
 * - Zero-lag, zero battery drain (Auto-pauses on background tabs via visibilitychange)
 * - Celebratory shower burst on code execution (bgCanvas.burst())
 * - Theme-aware (Celestial Gold dark mode & Clean Light mode)
 */

(function () {
    'use strict';

    class CosmicShootingStarEngine {
        constructor(canvasId = 'bgCanvas') {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = canvasId;
                this.canvas.className = 'celestial-stars-canvas';
                document.body.prepend(this.canvas);
            }

            this.ctx = this.canvas.getContext('2d', { alpha: true });
            this.isActive = true;
            this.isTabVisible = true;
            this.theme = document.documentElement.getAttribute('data-theme') || 'dark';

            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            // Ambient Stars
            this.ambientStars = [];
            this.ambientStarCount = 55;

            // Active Meteors & Stardust Embers
            this.meteors = [];
            this.embers = [];
            this.lastSpawnTime = 0;
            this.spawnInterval = 900; // ms between natural shooting stars

            // Animation frame
            this.animId = null;
            this.lastTimestamp = performance.now();

            this.init();
        }

        init() {
            this.resize();
            this.initAmbientStars();

            window.addEventListener('resize', () => this.resize(), { passive: true });

            document.addEventListener('visibilitychange', () => {
                this.isTabVisible = document.visibilityState === 'visible';
                if (this.isTabVisible && this.isActive) {
                    this.lastTimestamp = performance.now();
                    this.loop(this.lastTimestamp);
                }
            });

            // Start loop
            this.loop(performance.now());
        }

        resize() {
            this.width = window.innerWidth || document.documentElement.clientWidth || 1200;
            this.height = window.innerHeight || document.documentElement.clientHeight || 800;

            this.canvas.width = Math.floor(this.width * this.dpr);
            this.canvas.height = Math.floor(this.height * this.dpr);

            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';

            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        initAmbientStars() {
            this.ambientStars = [];
            for (let i = 0; i < this.ambientStarCount; i++) {
                this.ambientStars.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    radius: Math.random() * 1.3 + 0.5,
                    baseAlpha: Math.random() * 0.45 + 0.25,
                    twinkleSpeed: Math.random() * 0.002 + 0.001,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        spawnMeteor(customX, customY, isBurst = false) {
            // Trajectory angle: ~35° to 45° sweeping diagonally across the sky
            const angleDeg = isBurst ? (28 + Math.random() * 26) : (34 + Math.random() * 12);
            const angle = (angleDeg * Math.PI) / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Determine starting point
            let startX, startY;
            if (typeof customX === 'number' && typeof customY === 'number') {
                startX = customX;
                startY = customY;
            } else {
                // Natural sky spawn: from top or upper-left
                if (Math.random() < 0.65) {
                    startX = Math.random() * (this.width + 200) - 200;
                    startY = -30 - Math.random() * 80;
                } else {
                    startX = -30 - Math.random() * 60;
                    startY = Math.random() * (this.height * 0.45);
                }
            }

            // Variety: 12% Super Bolides, 20% Distant micro-streaks, 68% Classic Meteors
            const randType = Math.random();
            let type = 'classic';
            let speed = 14 + Math.random() * 8;
            let length = 140 + Math.random() * 90;
            let thickness = 1.4 + Math.random() * 0.7;
            let maxAlpha = 0.85 + Math.random() * 0.15;

            if (randType < 0.12 && !isBurst) {
                // Majestic Super Bolide (Long glowing ionized path with bloom)
                type = 'bolide';
                speed = 19 + Math.random() * 7;
                length = 260 + Math.random() * 120;
                thickness = 2.6 + Math.random() * 1.0;
                maxAlpha = 0.98;
            } else if (randType < 0.32) {
                // Distant subtle stardust streak
                type = 'micro';
                speed = 11 + Math.random() * 6;
                length = 80 + Math.random() * 50;
                thickness = 0.9 + Math.random() * 0.4;
                maxAlpha = 0.45;
            }

            this.meteors.push({
                x: startX,
                y: startY,
                dx: cos * speed,
                dy: sin * speed,
                length: length,
                thickness: thickness,
                alpha: 0,
                maxAlpha: maxAlpha,
                type: type,
                progress: 0,
                duration: (length * 1.4) + Math.random() * 300,
                age: 0,
                fadeState: 'in' // 'in', 'alive', 'out'
            });
        }

        spawnEmber(x, y) {
            if (this.embers.length > 40) return;
            this.embers.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                radius: Math.random() * 1.2 + 0.6,
                alpha: 0.8,
                decay: 0.035 + Math.random() * 0.02
            });
        }

        burst(count = 7) {
            // Rapid cascade of shooting stars sweeping across the page!
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const startX = Math.random() * this.width * 0.8;
                    const startY = Math.random() * (this.height * 0.3) - 40;
                    this.spawnMeteor(startX, startY, true);
                }, i * 90);
            }
        }

        setTheme(themeName) {
            this.theme = themeName || 'dark';
        }

        loop(timestamp) {
            if (!this.isActive) return;

            if (!this.isTabVisible) {
                return;
            }

            this.animId = requestAnimationFrame((t) => this.loop(t));

            const dt = Math.min(timestamp - this.lastTimestamp, 32);
            this.lastTimestamp = timestamp;

            // Clear full canvas
            this.ctx.clearRect(0, 0, this.width, this.height);

            const isLight = this.theme === 'light';

            // 1. Draw Ambient Constellation Starfield
            this.renderAmbientStars(timestamp, isLight);

            // 2. Spawn Meteors at natural continuous intervals
            if (timestamp - this.lastSpawnTime > this.spawnInterval) {
                this.spawnMeteor();
                this.lastSpawnTime = timestamp;
                // Randomized next interval: 650ms to 1350ms
                this.spawnInterval = 650 + Math.random() * 700;
            }

            // 3. Render and update Stardust Embers
            this.renderEmbers(isLight);

            // 4. Render and update Shooting Stars
            this.renderMeteors(isLight);
        }

        renderAmbientStars(timestamp, isLight) {
            const ctx = this.ctx;
            // Pure Celestial Golden Palette
            const goldPalette = [
                '255, 212, 63',  // #ffd43f Celestial Radiant Gold
                '251, 191, 36',  // #fbbf24 Warm Gold
                '245, 158, 11',  // #f59e0b Amber Honey Gold
                '255, 224, 130'  // #ffe082 Soft Gold
            ];

            for (let i = 0; i < this.ambientStars.length; i++) {
                const s = this.ambientStars[i];
                const twinkle = Math.sin(timestamp * s.twinkleSpeed + s.phase);
                const alpha = Math.max(0.12, Math.min(1, s.baseAlpha + twinkle * 0.28));
                const rgb = goldPalette[i % goldPalette.length];

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);

                if (isLight) {
                    ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.55})`;
                } else {
                    ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
                }
                ctx.fill();
            }
        }

        renderMeteors(isLight) {
            const ctx = this.ctx;

            for (let i = this.meteors.length - 1; i >= 0; i--) {
                const m = this.meteors[i];

                // Update position
                m.x += m.dx;
                m.y += m.dy;
                m.age++;

                // Fade In & Out logic
                if (m.fadeState === 'in') {
                    m.alpha += 0.08;
                    if (m.alpha >= m.maxAlpha) {
                        m.alpha = m.maxAlpha;
                        m.fadeState = 'alive';
                    }
                } else if (m.fadeState === 'alive') {
                    // Start fading out after travelling a certain distance
                    if (m.y > this.height * 0.65 || m.x > this.width + 100 || m.age > 45) {
                        m.fadeState = 'out';
                    }
                } else if (m.fadeState === 'out') {
                    m.alpha -= 0.045;
                }

                // If completely dead or off screen
                if (m.alpha <= 0 || m.y > this.height + 200 || m.x > this.width + 300) {
                    this.meteors.splice(i, 1);
                    continue;
                }

                // Compute tail coordinates
                const hyp = Math.sqrt(m.dx * m.dx + m.dy * m.dy);
                const ux = m.dx / hyp;
                const uy = m.dy / hyp;

                const tailX = m.x - ux * m.length;
                const tailY = m.y - uy * m.length;

                // Create radiant PURE GOLDEN linear gradient along the tail
                const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);

                if (isLight) {
                    grad.addColorStop(0, `rgba(217, 119, 6, 0)`);
                    grad.addColorStop(0.35, `rgba(217, 119, 6, ${m.alpha * 0.25})`);
                    grad.addColorStop(0.75, `rgba(245, 158, 11, ${m.alpha * 0.7})`);
                    grad.addColorStop(1, `rgba(217, 119, 6, ${m.alpha * 0.95})`);
                } else {
                    grad.addColorStop(0, `rgba(217, 119, 6, 0)`);
                    grad.addColorStop(0.3, `rgba(245, 158, 11, ${m.alpha * 0.35})`);
                    grad.addColorStop(0.75, `rgba(255, 193, 7, ${m.alpha * 0.85})`);
                    grad.addColorStop(1, `rgba(255, 212, 63, ${m.alpha})`);
                }

                // Draw Meteor Tail
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(m.x, m.y);
                ctx.strokeStyle = grad;
                ctx.lineWidth = m.thickness;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Draw Radiant PURE GOLDEN Meteor Head (No white, 100% celestial gold)
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.thickness * 0.85, 0, Math.PI * 2);
                ctx.fillStyle = isLight ? `rgba(217, 119, 6, ${m.alpha})` : `rgba(255, 212, 63, ${m.alpha})`;
                ctx.fill();

                // Extra Golden Glow bloom for Bolides
                if (m.type === 'bolide') {
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, m.thickness * 2.4, 0, Math.PI * 2);
                    ctx.fillStyle = isLight ? `rgba(245, 158, 11, ${m.alpha * 0.22})` : `rgba(255, 193, 7, ${m.alpha * 0.35})`;
                    ctx.fill();

                    // Drop occasional pure golden ember
                    if (Math.random() < 0.4) {
                        this.spawnEmber(m.x, m.y);
                    }
                }
            }
        }

        renderEmbers(isLight) {
            const ctx = this.ctx;
            for (let i = this.embers.length - 1; i >= 0; i--) {
                const e = this.embers[i];
                e.x += e.vx;
                e.y += e.vy;
                e.alpha -= e.decay;

                if (e.alpha <= 0) {
                    this.embers.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fillStyle = isLight
                    ? `rgba(217, 119, 6, ${e.alpha * 0.7})`
                    : `rgba(255, 212, 63, ${e.alpha})`;
                ctx.fill();
            }
        }

        destroy() {
            this.isActive = false;
            if (this.animId) {
                cancelAnimationFrame(this.animId);
            }
        }
    }

    // Global singleton & backward-compatible wrapper
    let globalEngine = null;

    class BackgroundCanvas {
        constructor(canvasId = 'bgCanvas') {
            if (!globalEngine) {
                globalEngine = new CosmicShootingStarEngine(canvasId);
            }
            this.engine = globalEngine;
        }

        burst(count) {
            if (this.engine) {
                this.engine.burst(count);
            }
        }

        setTheme(themeName) {
            if (this.engine) {
                this.engine.setTheme(themeName);
            }
        }

        destroy() {
            if (this.engine) {
                this.engine.destroy();
                globalEngine = null;
            }
        }
    }

    // Global trigger function for shooting star burst anywhere
    window.triggerShootingStar = function (x, y) {
        if (globalEngine) {
            globalEngine.spawnMeteor(x, y, true);
        }
    };

    window.BackgroundCanvas = BackgroundCanvas;

    // Automatically initialize when page loads if not already initialized
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!globalEngine) {
                globalEngine = new CosmicShootingStarEngine('bgCanvas');
            }
        });
    } else {
        if (!globalEngine) {
            globalEngine = new CosmicShootingStarEngine('bgCanvas');
        }
    }

})();
