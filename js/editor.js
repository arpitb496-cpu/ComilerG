/**
 * CompilerG - Monaco Editor Manager
 * Loads and manages VS Code's Monaco Editor engine with bulletproof fallback.
 */

class EditorManager {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.container = null;
        this.fallbackTextarea = null;
        this.currentDecorations = [];
        const savedTheme = localStorage.getItem('compilerg_theme');
        this.theme = savedTheme ? this.normalizeTheme(savedTheme) : 'compilerg-dark';
        this.fontSize = parseInt(localStorage.getItem('compilerg_fontsize') || '15', 10);
        this.minimapEnabled = localStorage.getItem('compilerg_minimap') !== 'false';
        this.currentLanguage = 'python';
        this.currentCode = '';
        this.onContentChangeCallbacks = [];
    }

    /**
     * Synchronously sets up fallback editor, then asynchronously loads Monaco
     */
    initSync(container, language = 'python', initialCode = '') {
        this.container = container;
        this.currentLanguage = language;
        this.currentCode = initialCode;

        // Render immediate fallback textarea so user can type/click instantly
        this.createFallbackEditor(container, initialCode);

        // Try loading Monaco asynchronously without blocking UI
        this.loadMonacoAsync(language, initialCode).catch(err => {
            console.warn('Monaco Editor load notice (using high-speed fallback editor):', err);
        });
    }

    createFallbackEditor(container, initialCode) {
        container.innerHTML = '';
        const ta = document.createElement('textarea');
        ta.id = 'compilergFallbackEditor';
        ta.className = 'fallback-editor';
        ta.value = initialCode;
        ta.spellcheck = false;
        ta.autocomplete = 'off';
        ta.autocorrect = 'off';
        ta.autocapitalize = 'off';
        ta.setAttribute('data-gramm', 'false');

        ta.addEventListener('input', () => {
            this.currentCode = ta.value;
            this.onContentChangeCallbacks.forEach(cb => cb(this.currentCode));
        });

        // Tab key support in textarea
        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
                ta.selectionStart = ta.selectionEnd = start + 4;
                this.currentCode = ta.value;
                this.onContentChangeCallbacks.forEach(cb => cb(this.currentCode));
            }
        });

        container.appendChild(ta);
        this.fallbackTextarea = ta;
    }

    async loadMonacoAsync(language, initialCode) {
        // Configure Web Worker environment to avoid CORS restrictions
        window.MonacoEnvironment = {
            getWorkerUrl: function (workerId, label) {
                return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                    self.MonacoEnvironment = {
                        baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/'
                    };
                    importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js');`
                )}`;
            }
        };

        return new Promise((resolve, reject) => {
            if (!window.require) {
                // If loader script is still loading, wait a moment
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.require) {
                        clearInterval(checkInterval);
                        this.bootstrapMonaco(language, initialCode, resolve, reject);
                    } else if (attempts > 30) {
                        clearInterval(checkInterval);
                        reject(new Error('Monaco AMD loader timed out.'));
                    }
                }, 100);
            } else {
                this.bootstrapMonaco(language, initialCode, resolve, reject);
            }
        });
    }

    bootstrapMonaco(language, initialCode, resolve, reject) {
        try {
            window.require.config({
                paths: {
                    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
                }
            });

            window.require(['vs/editor/editor.main'], () => {
                this.monaco = window.monaco;
                this.registerCustomThemes();

                // Preserve whatever code was written while Monaco was downloading
                const currentVal = this.fallbackTextarea ? this.fallbackTextarea.value : initialCode;
                this.currentCode = currentVal;

                // Clear container and mount Monaco
                this.container.innerHTML = '';

                this.editor = this.monaco.editor.create(this.container, {
                    value: currentVal,
                    language: language,
                    theme: this.theme,
                    fontSize: this.fontSize || 15,
                    lineHeight: 24,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas, monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: 'on',
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    minimap: { enabled: this.minimapEnabled },
                    padding: { top: 14, bottom: 14 }
                });

                this.fallbackTextarea = null;

                // Sync change events
                this.editor.onDidChangeModelContent(() => {
                    this.currentCode = this.editor.getValue();
                    this.onContentChangeCallbacks.forEach(cb => cb(this.currentCode));
                });

                // Keybindings inside Monaco: Ctrl+S to save, Ctrl+Enter to run
                this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
                    if (typeof window.handleSaveTrigger === 'function') {
                        window.handleSaveTrigger();
                    }
                });
                this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter, () => {
                    const runBtn = document.getElementById('runBtn');
                    if (runBtn) runBtn.click();
                });

                resolve(this.editor);
            }, (err) => {
                reject(err);
            });
        } catch (e) {
            reject(e);
        }
    }

    registerCustomThemes() {
        if (!this.monaco) return;

        // 1. CompilerG Modern Dark (Celestial Golden Obsidian)
        this.monaco.editor.defineTheme('compilerg-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '0c0906' },
                { token: 'comment', foreground: '8c7e6d', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ffd43f', fontStyle: 'bold' },
                { token: 'string', foreground: 'fde68a' },
                { token: 'number', foreground: 'f59e0b' },
                { token: 'type', foreground: 'deb887' },
                { token: 'function', foreground: 'fcd34d' },
                { token: 'variable', foreground: 'fffbeb' }
            ],
            colors: {
                'editor.background': '#0c0906',
                'editor.foreground': '#fffbeb',
                'editorCursor.foreground': '#ffd43f',
                'editor.lineHighlightBackground': '#1f160e70',
                'editorLineNumber.foreground': '#6b5c4c',
                'editorLineNumber.activeForeground': '#ffd43f',
                'editor.selectionBackground': '#f5a62340',
                'editor.inactiveSelectionBackground': '#f5a62320',
                'editorIndentGuide.background': '#292017',
                'editorIndentGuide.activeBackground': '#ffd43f40'
            }
        });

        // 2. CompilerG Pure Clean Light (Daylight Paper & Cobalt)
        this.monaco.editor.defineTheme('compilerg-light', {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#0f172a',
                'editorCursor.foreground': '#2563eb',
                'editor.lineHighlightBackground': '#e2e8f080',
                'editorLineNumber.foreground': '#94a3b8',
                'editorLineNumber.activeForeground': '#2563eb',
                'editor.selectionBackground': '#bfdbfe',
                'editorIndentGuide.background': '#e2e8f0',
                'editorIndentGuide.activeBackground': '#2563eb40'
            }
        });
    }

    normalizeTheme(themeName) {
        if (themeName === 'light' || themeName === 'compilerg-light' || themeName === 'vs') {
            return 'compilerg-light';
        }
        return 'compilerg-dark';
    }

    onDidChangeContent(callback) {
        this.onContentChangeCallbacks.push(callback);
    }

    getCode() {
        if (this.editor) return this.editor.getValue();
        if (this.fallbackTextarea) return this.fallbackTextarea.value;
        return this.currentCode || '';
    }

    setCode(code) {
        this.currentCode = code;
        if (this.editor) {
            this.editor.setValue(code);
        }
        if (this.fallbackTextarea) {
            this.fallbackTextarea.value = code;
        }
    }

    setLanguage(monacoLang) {
        this.currentLanguage = monacoLang;
        if (this.editor && this.monaco) {
            this.monaco.editor.setModelLanguage(this.editor.getModel(), monacoLang);
        }
    }

    setTheme(themeName) {
        const resolvedTheme = this.normalizeTheme(themeName);
        this.theme = resolvedTheme;
        localStorage.setItem('compilerg_theme', resolvedTheme);
        if (this.monaco) {
            this.monaco.editor.setTheme(resolvedTheme);
        }
    }

    setFontSize(size) {
        this.fontSize = parseInt(size, 10);
        localStorage.setItem('compilerg_fontsize', this.fontSize);
        if (this.editor) {
            this.editor.updateOptions({ fontSize: this.fontSize });
        }
        if (this.fallbackTextarea) {
            this.fallbackTextarea.style.fontSize = `${this.fontSize}px`;
        }
    }

    toggleMinimap(enabled) {
        this.minimapEnabled = enabled;
        localStorage.setItem('compilerg_minimap', enabled);
        if (this.editor) {
            this.editor.updateOptions({ minimap: { enabled } });
        }
    }

    highlightErrorLine(lineNumber) {
        if (!lineNumber || lineNumber < 1) return;

        if (this.editor && this.monaco) {
            this.clearDecorations();
            this.currentDecorations = this.editor.deltaDecorations([], [
                {
                    range: new this.monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'monaco-error-line-highlight',
                        glyphMarginClassName: 'monaco-error-glyph',
                        overviewRuler: { color: '#ef4444', position: this.monaco.editor.OverviewRulerLane.Full }
                    }
                }
            ]);
            this.editor.revealLineInCenter(lineNumber);
            this.editor.setPosition({ lineNumber, column: 1 });
        }
    }

    clearDecorations() {
        if (this.editor && this.currentDecorations.length) {
            this.currentDecorations = this.editor.deltaDecorations(this.currentDecorations, []);
        }
    }

    formatCode() {
        if (this.editor) {
            this.editor.getAction('editor.action.formatDocument')?.run();
        }
    }

    layout() {
        if (this.editor) {
            this.editor.layout();
        }
    }

    insertAtCursor(text) {
        if (this.editor) {
            const selection = this.editor.getSelection();
            const range = new this.monaco.Range(
                selection.startLineNumber, selection.startColumn,
                selection.endLineNumber, selection.endColumn
            );
            this.editor.executeEdits('snippet-insert', [{
                range: range,
                text: text,
                forceMoveMarkers: true
            }]);
            this.editor.focus();
        } else if (this.fallbackTextarea) {
            const ta = this.fallbackTextarea;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + text + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + text.length;
            this.currentCode = ta.value;
            this.onContentChangeCallbacks.forEach(cb => cb(this.currentCode));
            ta.focus();
        }
    }

    setWordWrap(enabled) {
        if (this.editor) {
            this.editor.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
        }
        if (this.fallbackTextarea) {
            this.fallbackTextarea.style.whiteSpace = enabled ? 'pre-wrap' : 'pre';
            this.fallbackTextarea.style.overflowWrap = enabled ? 'break-word' : 'normal';
        }
    }
}

window.EditorManager = EditorManager;

