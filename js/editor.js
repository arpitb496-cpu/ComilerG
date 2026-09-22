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
        this.theme = savedTheme ? this.normalizeTheme(savedTheme) : 'compilerg-codedex';
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

        // Codédex 16-bit RPG Fantasy Theme (Deep Midnight Purple, Gold Stars, Lilac & Mint)
        this.monaco.editor.defineTheme('compilerg-codedex', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '120f22' },
                { token: 'comment', foreground: '78719b', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
                { token: 'string', foreground: 'ffd43f' },
                { token: 'number', foreground: '38bdf8' },
                { token: 'type', foreground: 'f472b6' },
                { token: 'function', foreground: '34d399', fontStyle: 'bold' },
                { token: 'variable', foreground: 'f3f0ff' },
                { token: 'operator', foreground: 'fb7185' }
            ],
            colors: {
                'editor.background': '#120f22',
                'editor.foreground': '#f3f0ff',
                'editorCursor.foreground': '#ffd43f',
                'editor.lineHighlightBackground': '#1c173580',
                'editorLineNumber.foreground': '#5c5480',
                'editorLineNumber.activeForeground': '#ffd43f',
                'editor.selectionBackground': '#a855f745',
                'editor.inactiveSelectionBackground': '#a855f720',
                'editorIndentGuide.background': '#262040',
                'editorIndentGuide.activeBackground': '#ffd43f60'
            }
        });

        // 0. OneCompiler Obsidian Theme (Pitch Black, Neon Mint, Rose Pink & Electric Cyan)
        this.monaco.editor.defineTheme('compilerg-obsidian', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '08090d' },
                { token: 'comment', foreground: '525969', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
                { token: 'string', foreground: '34d399' },
                { token: 'number', foreground: '38bdf8' },
                { token: 'type', foreground: 'f43f5e' },
                { token: 'function', foreground: '60a5fa' },
                { token: 'variable', foreground: 'e2e8f0' },
                { token: 'operator', foreground: 'f472b6' }
            ],
            colors: {
                'editor.background': '#08090d',
                'editor.foreground': '#f1f5f9',
                'editorCursor.foreground': '#10b981',
                'editor.lineHighlightBackground': '#11141e80',
                'editorLineNumber.foreground': '#3e4451',
                'editorLineNumber.activeForeground': '#10b981',
                'editor.selectionBackground': '#10b98135',
                'editor.inactiveSelectionBackground': '#10b98118',
                'editorIndentGuide.background': '#1a1e28',
                'editorIndentGuide.activeBackground': '#10b98150'
            }
        });

        // 1. Tokyo Night Theme (Vibrant Indigo, Electric Cyan & Violet)
        this.monaco.editor.defineTheme('compilerg-tokyo-night', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '1a1b26' },
                { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'bb9af7', fontStyle: 'bold' },
                { token: 'string', foreground: '9ece6a' },
                { token: 'number', foreground: 'ff9e64' },
                { token: 'type', foreground: '2ac3de' },
                { token: 'function', foreground: '7aa2f7' },
                { token: 'variable', foreground: 'c0caf5' }
            ],
            colors: {
                'editor.background': '#1a1b26',
                'editor.foreground': '#c0caf5',
                'editorCursor.foreground': '#7dcfff',
                'editor.lineHighlightBackground': '#24283b80',
                'editorLineNumber.foreground': '#565f89',
                'editorLineNumber.activeForeground': '#7dcfff',
                'editor.selectionBackground': '#364a8280',
                'editor.inactiveSelectionBackground': '#364a8240',
                'editorIndentGuide.background': '#292e42',
                'editorIndentGuide.activeBackground': '#7dcfff50'
            }
        });

        // 2. Cyberpunk 2077 Synthwave (Neon Cyan, Glowing Pink & Violet)
        this.monaco.editor.defineTheme('compilerg-cyberpunk', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '120422' },
                { token: 'comment', foreground: '795290', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff007f', fontStyle: 'bold' },
                { token: 'string', foreground: 'ffe600' },
                { token: 'number', foreground: '00f5ff' },
                { token: 'type', foreground: 'ff71ce' },
                { token: 'function', foreground: '01cdfe' },
                { token: 'variable', foreground: 'f8f9fa' }
            ],
            colors: {
                'editor.background': '#120422',
                'editor.foreground': '#f8f9fa',
                'editorCursor.foreground': '#00f5ff',
                'editor.lineHighlightBackground': '#26094280',
                'editorLineNumber.foreground': '#795290',
                'editorLineNumber.activeForeground': '#00f5ff',
                'editor.selectionBackground': '#ff007f40',
                'editor.inactiveSelectionBackground': '#ff007f20',
                'editorIndentGuide.background': '#2d124d',
                'editorIndentGuide.activeBackground': '#00f5ff50'
            }
        });

        // 3. Dracula Pro (Classic Vampire Slate, Pink & Purple)
        this.monaco.editor.defineTheme('compilerg-dracula', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '282a36' },
                { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
                { token: 'string', foreground: 'f1fa8c' },
                { token: 'number', foreground: 'bd93f9' },
                { token: 'type', foreground: '8be9fd' },
                { token: 'function', foreground: '50fa7b' },
                { token: 'variable', foreground: 'f8f8f2' }
            ],
            colors: {
                'editor.background': '#282a36',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#44475a50',
                'editorLineNumber.foreground': '#6272a4',
                'editorLineNumber.activeForeground': '#bd93f9',
                'editor.selectionBackground': '#44475a80',
                'editor.inactiveSelectionBackground': '#44475a40',
                'editorIndentGuide.background': '#44475a',
                'editorIndentGuide.activeBackground': '#bd93f950'
            }
        });

        // 4. One Dark Pro (Atom & VS Code Slate, Peach & Mint)
        this.monaco.editor.defineTheme('compilerg-one-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '21252b' },
                { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c678dd', fontStyle: 'bold' },
                { token: 'string', foreground: '98c379' },
                { token: 'number', foreground: 'd19a66' },
                { token: 'type', foreground: 'e5c07b' },
                { token: 'function', foreground: '61afef' },
                { token: 'variable', foreground: 'abb2bf' }
            ],
            colors: {
                'editor.background': '#21252b',
                'editor.foreground': '#abb2bf',
                'editorCursor.foreground': '#528bff',
                'editor.lineHighlightBackground': '#2c313a80',
                'editorLineNumber.foreground': '#5c6370',
                'editorLineNumber.activeForeground': '#61afef',
                'editor.selectionBackground': '#3e445180',
                'editor.inactiveSelectionBackground': '#3e445140',
                'editorIndentGuide.background': '#2c313a',
                'editorIndentGuide.activeBackground': '#61afef40'
            }
        });

        // 5. CompilerG Modern Dark (Celestial Golden Obsidian)
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

        // 6. CompilerG Pure Clean Light (Daylight Paper & Cobalt)
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

        // 7. Nord (Frosty Arctic Blue & Slate)
        this.monaco.editor.defineTheme('compilerg-nord', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '2e3440' },
                { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
                { token: 'keyword', foreground: '81a1c1', fontStyle: 'bold' },
                { token: 'string', foreground: 'a3be8c' },
                { token: 'number', foreground: 'b48ead' },
                { token: 'type', foreground: '8fbcbb' },
                { token: 'function', foreground: '88c0d0' },
                { token: 'variable', foreground: 'd8dee9' }
            ],
            colors: {
                'editor.background': '#2e3440',
                'editor.foreground': '#d8dee9',
                'editorCursor.foreground': '#d8dee9',
                'editor.lineHighlightBackground': '#3b425280',
                'editorLineNumber.foreground': '#4c566a',
                'editorLineNumber.activeForeground': '#88c0d0',
                'editor.selectionBackground': '#434c5e80',
                'editorIndentGuide.background': '#3b4252',
                'editorIndentGuide.activeBackground': '#88c0d040'
            }
        });

        // 8. Monokai (Classic Pro Neon)
        this.monaco.editor.defineTheme('compilerg-monokai', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '272822' },
                { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'f92672', fontStyle: 'bold' },
                { token: 'string', foreground: 'e6db74' },
                { token: 'number', foreground: 'ae81ff' },
                { token: 'type', foreground: '66d9ef' },
                { token: 'function', foreground: 'a6e22e' },
                { token: 'variable', foreground: 'f8f8f2' }
            ],
            colors: {
                'editor.background': '#272822',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#3e3d3280',
                'editorLineNumber.foreground': '#75715e',
                'editorLineNumber.activeForeground': '#a6e22e',
                'editor.selectionBackground': '#49483e80',
                'editorIndentGuide.background': '#3e3d32',
                'editorIndentGuide.activeBackground': '#a6e22e40'
            }
        });

        // 9. Solarized Dark (Balanced Scientific Teal)
        this.monaco.editor.defineTheme('compilerg-solarized', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '002b36' },
                { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
                { token: 'keyword', foreground: '859900', fontStyle: 'bold' },
                { token: 'string', foreground: '2aa198' },
                { token: 'number', foreground: 'd33682' },
                { token: 'type', foreground: 'b58900' },
                { token: 'function', foreground: '268bd2' },
                { token: 'variable', foreground: '839496' }
            ],
            colors: {
                'editor.background': '#002b36',
                'editor.foreground': '#839496',
                'editorCursor.foreground': '#839496',
                'editor.lineHighlightBackground': '#07364280',
                'editorLineNumber.foreground': '#586e75',
                'editorLineNumber.activeForeground': '#268bd2',
                'editor.selectionBackground': '#073642',
                'editorIndentGuide.background': '#073642',
                'editorIndentGuide.activeBackground': '#268bd240'
            }
        });
    }

    normalizeTheme(themeName) {
        const themeMap = {
            'codedex': 'compilerg-codedex',
            'compilerg-codedex': 'compilerg-codedex',
            'obsidian': 'compilerg-obsidian',
            'compilerg-obsidian': 'compilerg-obsidian',
            'tokyo-night': 'compilerg-tokyo-night',
            'compilerg-tokyo-night': 'compilerg-tokyo-night',
            'cyberpunk': 'compilerg-cyberpunk',
            'compilerg-cyberpunk': 'compilerg-cyberpunk',
            'dracula': 'compilerg-dracula',
            'compilerg-dracula': 'compilerg-dracula',
            'one-dark': 'compilerg-one-dark',
            'compilerg-one-dark': 'compilerg-one-dark',
            'nord': 'compilerg-nord',
            'compilerg-nord': 'compilerg-nord',
            'monokai': 'compilerg-monokai',
            'compilerg-monokai': 'compilerg-monokai',
            'solarized': 'compilerg-solarized',
            'compilerg-solarized': 'compilerg-solarized',
            'light': 'compilerg-light',
            'compilerg-light': 'compilerg-light',
            'vs': 'compilerg-light',
            'dark': 'compilerg-dark',
            'compilerg-dark': 'compilerg-dark',
            'vs-dark': 'compilerg-dark'
        };
        return themeMap[themeName] || 'compilerg-codedex';
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

