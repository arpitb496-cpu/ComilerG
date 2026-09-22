/**
 * CompilerG - Background Adapter
 */


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
