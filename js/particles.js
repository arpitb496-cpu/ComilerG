/**
 * CompilerG - Codédex Starfield & Stardust Canvas Engine
 * Renders the iconic Codédex retro pixel starfield (⋆˙⟡) with 4-point cross stars,
 * floating upward physics, shooting stars, and an interactive mouse stardust trail.
 */

class BackgroundCanvas {
    constructor(canvasId = 'bgCanvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.starCount = 55;
        this.stardust = []; // Cursor trail particles
        this.shootingStars = [];
        this.mouse = { x: -1000, y: -1000 };
        this.animationFrameId = null;
        this.isActive = true;
        this.lastShootingStarTime = performance.now();

        // Theme-specific color palettes
        this.themePalettes = {
            'codedex': {
                sky: '#0e0c18',
                stars: ['#ffffff', '#ffd43f', '#c4b5fd', '#6ee7b7', '#f472b6'],
                nebula1: 'rgba(139, 92, 246, 0.08)',
                nebula2: 'rgba(255, 212, 63, 0.05)',
                nebula3: 'rgba(244, 114, 182, 0.05)',
                gridLine: 'rgba(167, 139, 250, 0.04)'
            },
            'obsidian': {
                sky: '#06070a',
                stars: ['#ffffff', '#10b981', '#34d399', '#38bdf8', '#f43f5e'],
                nebula1: 'rgba(16, 185, 129, 0.08)',
                nebula2: 'rgba(6, 182, 212, 0.06)',
                nebula3: 'rgba(236, 72, 153, 0.04)',
                gridLine: 'rgba(16, 185, 129, 0.04)'
            },
            'tokyo-night': {
                sky: '#13141c',
                stars: ['#c0caf5', '#7dcfff', '#bb9af7', '#7aa2f7'],
                nebula1: 'rgba(122, 162, 247, 0.08)',
                nebula2: 'rgba(187, 154, 247, 0.07)',
                nebula3: 'rgba(125, 207, 255, 0.05)',
                gridLine: 'rgba(125, 207, 255, 0.04)'
            },
            'cyberpunk': {
                sky: '#0a0314',
                stars: ['#ffffff', '#ff007f', '#00f5ff', '#ffe600'],
                nebula1: 'rgba(255, 0, 127, 0.09)',
                nebula2: 'rgba(0, 245, 255, 0.08)',
                nebula3: 'rgba(181, 55, 242, 0.07)',
                gridLine: 'rgba(255, 0, 127, 0.05)'
            },
            'dracula': {
                sky: '#1e1f29',
                stars: ['#f8f8f2', '#bd93f9', '#ff79c6', '#50fa7b'],
                nebula1: 'rgba(189, 147, 249, 0.08)',
                nebula2: 'rgba(255, 121, 198, 0.06)',
                nebula3: 'rgba(139, 233, 253, 0.05)',
                gridLine: 'rgba(189, 147, 249, 0.04)'
            },
            'one-dark': {
                sky: '#181a1f',
                stars: ['#abb2bf', '#61afef', '#98c379', '#c678dd'],
                nebula1: 'rgba(97, 175, 239, 0.07)',
                nebula2: 'rgba(198, 120, 221, 0.06)',
                nebula3: 'rgba(152, 195, 121, 0.05)',
                gridLine: 'rgba(97, 175, 239, 0.04)'
            },
            'nord': {
                sky: '#2e3440',
                stars: ['#eceff4', '#88c0d0', '#81a1c1', '#a3be8c'],
                nebula1: 'rgba(136, 192, 208, 0.08)',
                nebula2: 'rgba(129, 161, 193, 0.06)',
                nebula3: 'rgba(180, 142, 173, 0.05)',
                gridLine: 'rgba(136, 192, 208, 0.04)'
            },
            'monokai': {
                sky: '#191919',
                stars: ['#f8f8f2', '#f92672', '#a6e22e', '#66d9ef'],
                nebula1: 'rgba(249, 38, 114, 0.08)',
                nebula2: 'rgba(166, 226, 46, 0.07)',
                nebula3: 'rgba(174, 129, 255, 0.06)',
                gridLine: 'rgba(166, 226, 46, 0.04)'
            },
            'solarized': {
                sky: '#00212b',
                stars: ['#839496', '#268bd2', '#2aa198', '#859900'],
                nebula1: 'rgba(38, 139, 210, 0.08)',
                nebula2: 'rgba(42, 161, 152, 0.06)',
                nebula3: 'rgba(108, 113, 196, 0.05)',
                gridLine: 'rgba(38, 139, 210, 0.04)'
            },
            'dark': {
                sky: '#0b0f19',
                stars: ['#f1f5f9', '#38bdf8', '#3b82f6', '#818cf8'],
                nebula1: 'rgba(56, 189, 248, 0.07)',
                nebula2: 'rgba(59, 130, 246, 0.06)',
                nebula3: 'rgba(139, 92, 246, 0.05)',
                gridLine: 'rgba(56, 189, 248, 0.04)'
            },
            'light': {
                sky: '#f8fafc',
                stars: ['#2563eb', '#0284c7', '#7c3aed', '#10b981'],
                nebula1: 'rgba(37, 99, 235, 0.04)',
                nebula2: 'rgba(14, 165, 233, 0.03)',
                nebula3: 'rgba(99, 102, 241, 0.02)',
                gridLine: 'rgba(0, 0, 0, 0.03)'
            }
        };

        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'codedex';

        // Floating fantasy nebulae
        this.orbs = [
            { x: 0.2, y: 0.3, radius: 380, vx: 0.0002, vy: 0.00015, phase: 0 },
            { x: 0.8, y: 0.7, radius: 440, vx: -0.00018, vy: 0.0002, phase: 1.8 },
            { x: 0.5, y: 0.9, radius: 350, vx: 0.00015, vy: -0.00018, phase: 3.5 }
        ];

        this.init();
    }

    init() {
        this.resize();
        this.render();
        window.addEventListener('resize', () => {
            this.resize();
            this.render();
        }, { passive: true });
    }

    resize() {
        if (!this.canvas) return;
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }

    createStars() {
        this.stars = [];
        const palette = this.getPalette();
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() < 0.25 ? 6 : (Math.random() < 0.55 ? 4 : 2), // 2px dot, 4px cross, 6px big cross
                vy: -(Math.random() * 0.4 + 0.15), // Gently floating upward
                vx: (Math.random() - 0.5) * 0.1,
                color: palette.stars[Math.floor(Math.random() * palette.stars.length)],
                twinkleSpeed: Math.random() * 0.03 + 0.015,
                twinkleVal: Math.random() * Math.PI * 2
            });
        }
    }

    getPalette() {
        return this.themePalettes[this.currentTheme] || this.themePalettes['codedex'];
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.createStars();
    }

    burst() {
        // Dramatic XP/Run celebration burst
        const palette = this.getPalette();
        for (let i = 0; i < 28; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 9 + 4;
            this.stardust.push({
                x: this.width / 2 + (Math.random() - 0.5) * 60,
                y: this.height / 2 + (Math.random() - 0.5) * 60,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color: palette.stars[Math.floor(Math.random() * palette.stars.length)],
                alpha: 1.0,
                decay: Math.random() * 0.02 + 0.015
            });
        }
    }

    spawnShootingStar() {
        const startX = Math.random() * this.width * 0.8;
        const startY = Math.random() * this.height * 0.35;
        this.shootingStars.push({
            x: startX,
            y: startY,
            length: Math.random() * 80 + 60,
            speed: Math.random() * 8 + 10,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
            alpha: 1.0,
            color: '#ffd43f'
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // Spawn fairy stardust behind cursor
            if (Math.random() < 0.4) {
                const palette = this.getPalette();
                this.stardust.push({
                    x: e.clientX + (Math.random() - 0.5) * 8,
                    y: e.clientY + (Math.random() - 0.5) * 8,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2 - 0.5,
                    size: Math.random() * 3 + 1,
                    color: palette.stars[Math.floor(Math.random() * palette.stars.length)],
                    alpha: 0.9,
                    decay: 0.025
                });
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isActive = false;
                if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            } else {
                this.isActive = true;
                this.render();
            }
        });
    }

    drawPixelCross(ctx, x, y, size, color, alpha) {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        const half = Math.floor(size / 2);

        // Core center pixel
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);

        if (size >= 4) {
            // Horizontal arms
            ctx.fillRect(Math.round(x - half), Math.round(y), half * 2 + 2, 2);
            // Vertical arms
            ctx.fillRect(Math.round(x), Math.round(y - half), 2, half * 2 + 2);
        }

        if (size >= 6) {
            // Shimmer glow
            ctx.shadowBlur = 6;
            ctx.shadowColor = color;
            ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 4, 4);
            ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = 1.0;
    }

    render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const palette = this.getPalette();
        ctx.clearRect(0, 0, this.width, this.height);
        const grad = ctx.createRadialGradient(this.width * 0.5, this.height * 0.2, 40, this.width * 0.5, this.height * 0.5, this.width * 0.8);
        grad.addColorStop(0, palette.nebula1 || 'rgba(56, 189, 248, 0.04)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }
}

window.BackgroundCanvas = BackgroundCanvas;
