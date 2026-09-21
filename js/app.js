/**
 * CompilerG - Application Controller
 * High-speed multi-language IDE controller managing Monaco editor,
 * local & cloud code execution, multi-file/page tabs, AI debugging, theme engine, and split-pane layout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const rawSavedTheme = localStorage.getItem('compilerg_theme') || 'dark';
    const initialTheme = rawSavedTheme.replace('compilerg-', '');

    const state = {
        currentLanguage: localStorage.getItem('compilerg_lang') || 'python',
        theme: initialTheme,
        fontSize: parseInt(localStorage.getItem('compilerg_fontsize') || '14', 10),
        minimap: localStorage.getItem('compilerg_minimap') !== 'false',
        isExecuting: false,
        lastErrorOutput: '',
        lastFixedCode: null,
        files: [],
        activeFileId: null,
        activeInteractiveSessionId: null,
        interactivePollInterval: null
    };

    // --- Core Instances ---
    const editorManager = new EditorManager();
    const executor = new CodeExecutor();
    const aiDebugger = new AIDebugger();
    const bgCanvas = window.BackgroundCanvas ? new window.BackgroundCanvas('bgCanvas') : null;

    // --- DOM Elements ---
    const monacoContainer = document.getElementById('monacoContainer');
    const runBtn = document.getElementById('runBtn');
    const langSelect = document.getElementById('langSelect');
    const currentFileName = document.getElementById('currentFileName');
    const fileIcon = document.getElementById('fileIcon');
    const fileTabsList = document.getElementById('fileTabsList');
    const addFileBtn = document.getElementById('addFileBtn');
    const newFileModal = document.getElementById('newFileModal');
    const newFileNameInput = document.getElementById('newFileNameInput');
    const confirmAddFileBtn = document.getElementById('confirmAddFileBtn');
    const editorSaveBadge = document.getElementById('editorSaveBadge');
    const editorSaveLabel = document.getElementById('editorSaveLabel');

    const resetCodeBtn = document.getElementById('resetCodeBtn');
    const downloadCodeBtn = document.getElementById('downloadCodeBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const formatCodeBtn = document.getElementById('formatCodeBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeDropdownContainer = document.getElementById('themeDropdownContainer');
    const themeDropdownMenu = document.getElementById('themeDropdownMenu');
    const themeIndicatorDot = document.getElementById('themeIndicatorDot');
    const themeNameLabel = document.getElementById('themeNameLabel');
    const themeSelectInput = document.getElementById('themeSelectInput');
    const settingsBtn = document.getElementById('settingsBtn');
    const shortcutsBtn = document.getElementById('shortcutsBtn');
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');

    // Splitter & Panes
    const splitResizer = document.getElementById('splitResizer');
    const editorPane = document.getElementById('editorPane');
    const terminalPane = document.getElementById('terminalPane');
    const workspaceContainer = document.getElementById('workspaceContainer');

    // Tabs & Panels
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const outputScreen = document.getElementById('outputScreen');
    const stdinInput = document.getElementById('stdinInput');
    const webPreviewFrame = document.getElementById('webPreviewFrame');
    const webPreviewTabBtn = document.getElementById('webPreviewTabBtn');

    // Metrics & Badges
    const statusBadge = document.getElementById('statusBadge');
    const execTime = document.getElementById('execTime');
    const execMemory = document.getElementById('execMemory');

    // AI Debugger UI
    const aiAssistBtn = document.getElementById('aiAssistBtn');
    const aiDrawer = document.getElementById('aiDrawer');
    const closeAiDrawerBtn = document.getElementById('closeAiDrawerBtn');
    const aiDebugBanner = document.getElementById('aiDebugBanner');
    const bannerDebugBtn = document.getElementById('bannerDebugBtn');
    const bannerQuickFixBtn = document.getElementById('bannerQuickFixBtn');
    const aiErrorBadge = document.getElementById('aiErrorBadge');
    const aiExplanation = document.getElementById('aiExplanation');
    const aiSolutionText = document.getElementById('aiSolutionText');
    const aiCodeCard = document.getElementById('aiCodeCard');
    const aiFixedCodeSnippet = document.getElementById('aiFixedCodeSnippet');
    const applyAiFixBtn = document.getElementById('applyAiFixBtn');
    const aiExplainBtn = document.getElementById('aiExplainBtn');

    // Modals
    const settingsModal = document.getElementById('settingsModal');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const minimapToggle = document.getElementById('minimapToggle');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const shortcutsModal = document.getElementById('shortcutsModal');
    const toastContainer = document.getElementById('toastContainer');

    // --- Toast Notifications ---
    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // --- File Extension & Icon Helpers ---
    function getFileIcon(filename) {
        if (!filename) return '📄';
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'c': '🔷',
            'h': '📄',
            'cpp': '⚡',
            'hpp': '📄',
            'cc': '⚡',
            'py': '🐍',
            'js': '🟨',
            'jsx': '⚛️',
            'ts': '🔷',
            'tsx': '⚛️',
            'java': '☕',
            'html': '🌐',
            'htm': '🌐',
            'css': '🎨',
            'rs': '🦀',
            'go': '🐹',
            'cs': '🟣',
            'php': '🐘',
            'rb': '💎',
            'sh': '🐚',
            'kt': '🎯',
            'swift': '🐦',
            'json': '📋',
            'txt': '📝'
        };
        return iconMap[ext] || '📄';
    }

    function getMonacoLangFromFilename(filename) {
        if (!filename) return 'plaintext';
        const ext = filename.split('.').pop().toLowerCase();
        const langMap = {
            'c': 'c',
            'h': 'c',
            'cpp': 'cpp',
            'hpp': 'cpp',
            'cc': 'cpp',
            'py': 'python',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'java': 'java',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'rs': 'rust',
            'go': 'go',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'sh': 'shell',
            'kt': 'kotlin',
            'swift': 'swift',
            'json': 'json',
            'txt': 'plaintext'
        };
        return langMap[ext] || 'plaintext';
    }

    // --- Multi-File Persistence & User Auto-Save Management ---
    function updateAutoSaveStatus(status) {
        if (!editorSaveBadge) return;
        const iconEl = editorSaveBadge.querySelector('.save-status-icon');
        if (status === 'saving') {
            editorSaveBadge.classList.add('saving');
            if (editorSaveLabel) editorSaveLabel.textContent = 'Saving...';
            if (iconEl) iconEl.textContent = '⏳';
        } else {
            editorSaveBadge.classList.remove('saving');
            if (editorSaveLabel) {
                editorSaveLabel.textContent = window.currentUser ? 'Cloud Saved' : 'Auto-Saved';
            }
            if (iconEl) iconEl.textContent = '☁️';
        }
    }

    function loadFilesForLanguage(langKey) {
        const config = window.LANGUAGES[langKey] || window.LANGUAGES.python;
        let savedFilesJson = null;

        // 1. Check user-specific storage if signed in
        if (window.currentUser && window.currentUser.uid) {
            savedFilesJson = localStorage.getItem(`compilerg_u_${window.currentUser.uid}_files_${langKey}`);
        }
        // 2. Fallback to general storage
        if (!savedFilesJson) {
            savedFilesJson = localStorage.getItem(`compilerg_files_${langKey}`);
        }

        let files = [];
        if (savedFilesJson) {
            try {
                files = JSON.parse(savedFilesJson);
            } catch (e) {
                files = [];
            }
        }

        if (!files || files.length === 0) {
            let userCode = null;
            if (window.currentUser && window.currentUser.uid) {
                userCode = localStorage.getItem(`compilerg_u_${window.currentUser.uid}_code_${langKey}`);
            }
            const legacyCode = userCode || localStorage.getItem(`compilerg_code_${langKey}`) || window.BOILERPLATES[langKey] || '';
            files = [
                {
                    id: 'file-' + Date.now(),
                    name: config.filename,
                    content: legacyCode,
                    isMain: true
                }
            ];
        }

        state.files = files;
        state.activeFileId = files[0].id;
        renderFileTabs();
        updateAutoSaveStatus('saved');
        return files[0];
    }

    let saveDebounceTimer = null;
    function debouncedSaveCurrentFiles() {
        updateAutoSaveStatus('saving');
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(() => {
            saveCurrentFiles();
        }, 350);
    }

    function saveCurrentFiles() {
        if (!state.files || state.files.length === 0) return;
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            activeFile.content = editorManager.getCode();
            // Also update legacy single-file storage for main file
            if (activeFile.isMain || activeFile.name === window.LANGUAGES[state.currentLanguage]?.filename) {
                localStorage.setItem(`compilerg_code_${state.currentLanguage}`, activeFile.content);
                if (window.currentUser && window.currentUser.uid) {
                    localStorage.setItem(`compilerg_u_${window.currentUser.uid}_code_${state.currentLanguage}`, activeFile.content);
                }
            }
        }

        try {
            const filesJson = JSON.stringify(state.files);
            localStorage.setItem(`compilerg_files_${state.currentLanguage}`, filesJson);

            // User-scoped persistent storage
            if (window.currentUser && window.currentUser.uid) {
                const uid = window.currentUser.uid;
                localStorage.setItem(`compilerg_u_${uid}_files_${state.currentLanguage}`, filesJson);

                // Track list of user languages with custom code
                let userLangs = [];
                try {
                    userLangs = JSON.parse(localStorage.getItem(`compilerg_u_${uid}_langs`) || '[]');
                } catch (e) { userLangs = []; }
                if (!userLangs.includes(state.currentLanguage)) {
                    userLangs.push(state.currentLanguage);
                    localStorage.setItem(`compilerg_u_${uid}_langs`, JSON.stringify(userLangs));
                }

                // Cloud sync to server backend (non-blocking)
                fetch('/api/user/save-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: uid,
                        email: window.currentUser.email || '',
                        language: state.currentLanguage,
                        files: state.files,
                        code: activeFile ? activeFile.content : ''
                    })
                }).catch(() => { /* silent fail if offline */ });
            }
        } catch (e) {
            // In case localStorage is full
        }

        setTimeout(() => {
            updateAutoSaveStatus('saved');
        }, 200);
    }

    function renderFileTabs() {
        if (!fileTabsList) return;
        fileTabsList.innerHTML = '';

        state.files.forEach((file) => {
            const isActive = file.id === state.activeFileId;
            const tabItem = document.createElement('div');
            tabItem.className = `file-tab-item ${isActive ? 'active' : ''}`;
            tabItem.dataset.fileId = file.id;
            tabItem.title = file.name;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'file-tab-icon';
            iconSpan.textContent = getFileIcon(file.name);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-tab-name';
            nameSpan.textContent = file.name;

            tabItem.appendChild(iconSpan);
            tabItem.appendChild(nameSpan);

            // Allow closing tab if there is more than 1 file
            if (state.files.length > 1) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'file-tab-close';
                closeBtn.title = 'Close File';
                closeBtn.innerHTML = '✕';
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeFile(file.id);
                });
                tabItem.appendChild(closeBtn);
            }

            tabItem.addEventListener('click', () => {
                if (file.id !== state.activeFileId) {
                    switchToFile(file.id);
                }
            });

            fileTabsList.appendChild(tabItem);
        });

        // Update active file label in toolbar
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            if (currentFileName) currentFileName.textContent = activeFile.name;
            if (fileIcon) fileIcon.textContent = getFileIcon(activeFile.name);
        }
    }

    function switchToFile(fileId) {
        const currentActive = state.files.find(f => f.id === state.activeFileId);
        if (currentActive) {
            currentActive.content = editorManager.getCode();
        }

        const targetFile = state.files.find(f => f.id === fileId);
        if (!targetFile) return;

        state.activeFileId = fileId;
        const monacoLang = getMonacoLangFromFilename(targetFile.name);
        editorManager.setLanguage(monacoLang);
        editorManager.setCode(targetFile.content || '');
        editorManager.clearDecorations();

        renderFileTabs();
        saveCurrentFiles();
    }

    function addNewFile(fileName) {
        if (!fileName || !fileName.trim()) return;
        const cleanName = fileName.trim();

        // Check for duplicates
        const exists = state.files.some(f => f.name.toLowerCase() === cleanName.toLowerCase());
        if (exists) {
            showToast(`A file named "${cleanName}" already exists.`, 'error');
            return;
        }

        saveCurrentFiles();

        const newFile = {
            id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: cleanName,
            content: '',
            isMain: false
        };

        state.files.push(newFile);
        switchToFile(newFile.id);
        showToast(`Added ${cleanName}`, 'success');
    }

    function closeFile(fileId) {
        if (state.files.length <= 1) {
            showToast('Cannot close the only open file.', 'info');
            return;
        }

        const fileIndex = state.files.findIndex(f => f.id === fileId);
        if (fileIndex === -1) return;

        const closedFile = state.files[fileIndex];
        state.files.splice(fileIndex, 1);

        if (state.activeFileId === fileId) {
            const nextActiveIndex = Math.max(0, fileIndex - 1);
            state.activeFileId = state.files[nextActiveIndex].id;
            const nextFile = state.files[nextActiveIndex];
            editorManager.setLanguage(getMonacoLangFromFilename(nextFile.name));
            editorManager.setCode(nextFile.content || '');
            editorManager.clearDecorations();
        }

        renderFileTabs();
        saveCurrentFiles();
        showToast(`Closed ${closedFile.name}`, 'info');
    }

    // --- UI Synchronization ---
    function updateFileLabel(langConfig) {
        if (!langConfig) return;

        // Show/hide live preview tab for HTML
        if (webPreviewTabBtn) {
            if (langConfig.id === 'html') {
                webPreviewTabBtn.style.display = 'flex';
            } else {
                webPreviewTabBtn.style.display = 'none';
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab && activeTab.dataset.tab === 'preview') {
                    switchTab('output');
                }
            }
        }
    }

    function syncLanguageUI(langKey) {
        if (langSelect && langSelect.value !== langKey) {
            langSelect.value = langKey;
        }
    }

    function switchLanguage(newLangKey) {
        if (!window.LANGUAGES[newLangKey] || newLangKey === state.currentLanguage) return;

        saveCurrentFiles();
        state.currentLanguage = newLangKey;
        localStorage.setItem('compilerg_lang', newLangKey);

        const config = window.LANGUAGES[newLangKey];
        updateFileLabel(config);
        syncLanguageUI(newLangKey);

        const activeFile = loadFilesForLanguage(newLangKey);
        editorManager.setLanguage(getMonacoLangFromFilename(activeFile.name));
        editorManager.setCode(activeFile.content || '');
        editorManager.clearDecorations();

        if (statusBadge) {
            statusBadge.textContent = 'Ready';
            statusBadge.className = 'status-badge';
        }
        if (aiDebugBanner) aiDebugBanner.style.display = 'none';
        showToast(`Switched to ${config.name}`);
    }

    function switchTab(tabName) {
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Panel`);
        });
        if (tabName === 'stdin' && stdinInput) {
            stdinInput.focus();
            const stdinTabBtn = document.getElementById('stdinTabBtn');
            if (stdinTabBtn) {
                stdinTabBtn.classList.remove('needs-input');
                stdinTabBtn.title = '';
            }
        }
    }

    // --- Event Listeners ---

    // 1. Language selector dropdown
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            switchLanguage(e.target.value);
        });
    }

    // 2. Add File / Page Button & Modal
    if (addFileBtn) {
        addFileBtn.addEventListener('click', () => {
            const config = window.LANGUAGES[state.currentLanguage] || { extension: 'txt' };
            const nextNum = state.files.length + 1;
            const defaultName = `NewFile${nextNum}.${config.extension}`;
            if (newFileNameInput) {
                newFileNameInput.value = defaultName;
            }
            if (newFileModal) {
                newFileModal.classList.add('open');
                if (newFileNameInput) {
                    setTimeout(() => {
                        newFileNameInput.focus();
                        newFileNameInput.select();
                    }, 50);
                }
            }
        });
    }

    if (confirmAddFileBtn && newFileNameInput) {
        confirmAddFileBtn.addEventListener('click', () => {
            const val = newFileNameInput.value;
            if (val && val.trim()) {
                addNewFile(val.trim());
                if (newFileModal) newFileModal.classList.remove('open');
            }
        });

        newFileNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmAddFileBtn.click();
            }
        });
    }

    // 3. Tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(btn.dataset.tab);
        });
    });

    // 4. Smooth Draggable Split-Pane Resizing
    if (splitResizer && editorPane && workspaceContainer) {
        let isDragging = false;

        splitResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            splitResizer.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const containerRect = workspaceContainer.getBoundingClientRect();
            const availableWidth = containerRect.width - 6;
            const mouseOffset = e.clientX - containerRect.left;
            const clampedWidth = Math.max(260, Math.min(availableWidth - 260, mouseOffset));
            const pct = (clampedWidth / availableWidth) * 100;
            editorPane.style.flex = 'none';
            editorPane.style.width = `${pct}%`;
            editorManager.layout();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                splitResizer.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                editorManager.layout();
            }
        });
    }

    window.addEventListener('resize', () => {
        editorManager.layout();
    });

    // Detect if code uses standard input reading functions
    function detectCodeNeedsStdin(code, lang) {
        if (!code) return false;
        const clean = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/#.*$/gm, '');
        if (lang === 'c' || lang === 'cpp') {
            return /\b(scanf|scanf_s|cin\s*>>|getchar|gets|fgets|read)\b/.test(clean);
        }
        if (lang === 'python' || lang === 'python3' || lang === 'py') {
            return /\b(input\s*\(|sys\.stdin)/.test(clean);
        }
        if (lang === 'java') {
            return /\b(Scanner|BufferedReader|System\.in)\b/.test(clean);
        }
        if (lang === 'javascript' || lang === 'js' || lang === 'node') {
            return /\b(readline|prompt\s*\(|process\.stdin)/.test(clean);
        }
        if (lang === 'csharp' || lang === 'cs') {
            return /\bConsole\.(ReadLine|Read)\b/.test(clean);
        }
        if (lang === 'go') {
            return /\b(fmt\.Scan|fmt\.Scanln|fmt\.Scanf|bufio\.NewScanner)\b/.test(clean);
        }
        if (lang === 'rust') {
            return /\b(stdin\(\)\.read_line|io::stdin)\b/.test(clean);
        }
        if (lang === 'php') {
            return /\b(fgets\s*\(\s*STDIN|readline\s*\()\b/.test(clean);
        }
        if (lang === 'ruby') {
            return /\b(gets|readline)\b/.test(clean);
        }
        return false;
    }

    // 5. Code Execution (With Multi-File Bundling)
    async function runCode() {
        if (state.isExecuting) return;
        state.isExecuting = true;

        saveCurrentFiles();

        const currentActive = state.files.find(f => f.id === state.activeFileId);
        const code = editorManager.getCode();
        const stdin = stdinInput ? stdinInput.value : '';
        const langConfig = window.LANGUAGES[state.currentLanguage];

        // Format all files for execution payload
        const filesPayload = state.files.map(f => ({
            name: f.name,
            content: f.id === state.activeFileId ? code : f.content
        }));

        if (runBtn) {
            runBtn.classList.add('loading');
            const label = runBtn.querySelector('span');
            if (label) label.textContent = 'Running...';
        }
        if (statusBadge) {
            statusBadge.textContent = 'RUNNING';
            statusBadge.className = 'status-badge running';
        }
        if (outputScreen) {
            outputScreen.innerHTML = '<span style="color: #94a3b8;">Executing program...</span>';
        }

        // Reset Error State & Animations
        if (terminalPane) terminalPane.classList.remove('has-error');
        if (aiAssistBtn) aiAssistBtn.classList.remove('pulse-attention');
        if (bannerDebugBtn) bannerDebugBtn.classList.remove('pulse-attention');
        if (bannerQuickFixBtn) {
            bannerQuickFixBtn.style.display = 'none';
            bannerQuickFixBtn.classList.remove('pulse-attention');
        }
        if (aiDebugBanner) aiDebugBanner.style.display = 'none';
        editorManager.clearDecorations();

        if (langConfig && langConfig.id === 'html') {
            switchTab('preview');
        } else {
            switchTab('output');
        }

        // 1. Try Live Interactive Execution (C, C++, Python, Java, JS)
        const isInteractiveCandidate = ['c', 'cpp', 'python', 'python3', 'py', 'java', 'javascript', 'js', 'node'].includes(state.currentLanguage);
        if (isInteractiveCandidate) {
            try {
                const interactiveRes = await fetch('/api/run-interactive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: state.currentLanguage,
                        code,
                        files: filesPayload
                    })
                });
                const interactData = await interactiveRes.json();
                if (interactData && interactData.supported) {
                    if (interactData.compileError) {
                        handleExecutionError(interactData.output || 'Compilation failed.', code);
                        return;
                    }
                    if (interactData.isSuccess && interactData.sessionId) {
                        startInteractiveConsole(interactData.sessionId, code);
                        return;
                    }
                }
            } catch (err) {
                console.warn('Interactive execution init error, falling back to batch runner:', err);
            }
        }

        // 2. Standard Batch Execution Fallback
        try {
            const result = await executor.execute({
                languageKey: state.currentLanguage,
                code,
                stdin,
                files: filesPayload
            });

            if (execTime) execTime.textContent = result.time || '10 ms';
            if (execMemory) execMemory.textContent = result.memory || '0 KB';

            if (result.isWebMode) {
                if (statusBadge) {
                    statusBadge.textContent = 'SUCCESS';
                    statusBadge.className = 'status-badge success';
                }
                if (webPreviewFrame) webPreviewFrame.srcdoc = result.htmlContent;
                if (outputScreen) outputScreen.innerHTML = `<span class="stdout">${result.stdout}</span>`;
            } else if (result.isSuccess) {
                let stdoutText = result.stdout || '';
                if (stdoutText.length > 80000) {
                    stdoutText = stdoutText.slice(0, 80000) + '\n\n... [Output truncated: Exceeded 80,000 characters for browser performance]';
                }
                if (statusBadge) {
                    statusBadge.textContent = 'ACCEPTED (TURBO)';
                    statusBadge.className = 'status-badge turbo';
                }

                const needsStdin = detectCodeNeedsStdin(code, state.currentLanguage);
                const stdinIsEmpty = !stdin || !stdin.trim();
                const stdinTabBtn = document.getElementById('stdinTabBtn');

                let htmlOutput = stdoutText
                    ? `<span class="stdout">${escapeHtml(stdoutText)}</span>`
                    : '<span style="color: #64748b;">(Process completed with exit code 0)</span>';

                // If code expects user input but STDIN was empty, provide inline quick STDIN input
                if (needsStdin && stdinIsEmpty) {
                    htmlOutput += `
<div class="quick-stdin-card" id="quickStdinCard">
    <div class="quick-stdin-top">
        <span class="quick-stdin-badge">💡 Input Needed</span>
        <span class="quick-stdin-hint">This code reads user input (<code>scanf</code> / <code>cin</code> / <code>input()</code>).</span>
    </div>
    <div class="quick-stdin-subtext">
        C/C++ me input na milne par variables memory se garbage value (jaise 16) le lete hain. Apne inputs yaha enter karke <strong>Run with Input</strong> karein:
    </div>
    <div class="quick-stdin-row">
        <textarea id="quickStdinBox" class="quick-stdin-box" placeholder="Enter inputs (e.g. 5&#10;6)" rows="2"></textarea>
        <button id="quickStdinRunBtn" class="quick-stdin-run-btn" type="button" title="Set STDIN and Re-run">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>Run with Input</span>
        </button>
    </div>
</div>`;
                    if (stdinTabBtn) {
                        stdinTabBtn.classList.add('needs-input');
                        stdinTabBtn.title = 'Program expects input! Click to enter STDIN';
                    }
                } else {
                    if (stdinTabBtn) {
                        stdinTabBtn.classList.remove('needs-input');
                        stdinTabBtn.title = '';
                    }
                }

                if (outputScreen) {
                    outputScreen.innerHTML = htmlOutput;

                    const quickStdinRunBtn = document.getElementById('quickStdinRunBtn');
                    const quickStdinBox = document.getElementById('quickStdinBox');
                    if (quickStdinRunBtn && quickStdinBox) {
                        quickStdinRunBtn.addEventListener('click', () => {
                            if (stdinInput) {
                                stdinInput.value = quickStdinBox.value;
                            }
                            showToast('Input applied to STDIN! Re-testing...', 'success');
                            runCode();
                        });
                        quickStdinBox.addEventListener('keydown', (e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                quickStdinRunBtn.click();
                            }
                        });
                        setTimeout(() => quickStdinBox.focus(), 100);
                    }
                }
                state.lastErrorOutput = '';
            } else {
                handleExecutionError(
                    (result.compileOutput ? result.compileOutput + '\n' : '') + (result.stderr || '') || result.statusDescription || 'Runtime error occurred',
                    code,
                    result.stdout
                );
            }
        } catch (err) {
            if (statusBadge) {
                statusBadge.textContent = 'FAILED';
                statusBadge.className = 'status-badge error';
            }
            if (terminalPane) terminalPane.classList.add('has-error');
            if (outputScreen) outputScreen.innerHTML = `<div class="stderr">Execution error: ${escapeHtml(err.message)}</div>`;
        } finally {
            if (!state.activeInteractiveSessionId) {
                state.isExecuting = false;
                resetRunButtonState();
            }
        }
    }

    // ── Live Interactive Console Implementation ──────────────────────────────
    function startInteractiveConsole(sessionId, code) {
        state.activeInteractiveSessionId = sessionId;
        state.isExecuting = true;

        if (runBtn) {
            runBtn.classList.remove('loading');
            runBtn.classList.add('is-running');
            const label = runBtn.querySelector('span');
            if (label) label.textContent = 'Stop ⬛';
            runBtn.title = 'Stop Execution';
        }

        if (statusBadge) {
            statusBadge.textContent = 'RUNNING';
            statusBadge.className = 'status-badge running';
        }

        if (outputScreen) {
            outputScreen.innerHTML = `
<div class="interactive-terminal-wrap" id="interactiveTerminalWrap">
    <span class="interactive-terminal-history" id="terminalHistory"></span>
    <span class="interactive-terminal-active" id="terminalActiveLine">
        <span class="interactive-terminal-prompt" id="terminalActivePrompt"></span>
        <input type="text" class="interactive-terminal-input" id="terminalActiveInput" autocomplete="off" spellcheck="false" autofocus />
    </span>
</div>`;
        }

        const terminalActiveInput = document.getElementById('terminalActiveInput');
        const terminalActivePrompt = document.getElementById('terminalActivePrompt');
        const terminalHistory = document.getElementById('terminalHistory');
        const terminalActiveLine = document.getElementById('terminalActiveLine');

        if (terminalActiveInput) {
            setTimeout(() => terminalActiveInput.focus(), 50);
            terminalActiveInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const inputVal = terminalActiveInput.value;
                    terminalActiveInput.value = '';

                    if (terminalHistory && terminalActivePrompt) {
                        terminalHistory.textContent += terminalActivePrompt.textContent + inputVal + '\n';
                        terminalActivePrompt.textContent = '';
                    }

                    fetch('/api/session/write', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: state.activeInteractiveSessionId,
                            input: inputVal + '\n'
                        })
                    }).catch(console.error);

                    if (outputScreen) outputScreen.scrollTop = outputScreen.scrollHeight;
                }
            });
        }

        // Clicking anywhere inside terminal pane automatically focuses input
        if (outputScreen) {
            outputScreen.onclick = () => {
                const inp = document.getElementById('terminalActiveInput');
                if (inp && state.activeInteractiveSessionId) {
                    inp.focus();
                }
            };
        }

        // Auto-send STDIN tab content if user pre-filled it
        const prefilledStdin = stdinInput ? stdinInput.value : '';
        if (prefilledStdin && prefilledStdin.trim()) {
            setTimeout(() => {
                if (state.activeInteractiveSessionId) {
                    fetch('/api/session/write', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: state.activeInteractiveSessionId,
                            input: prefilledStdin + (prefilledStdin.endsWith('\n') ? '' : '\n')
                        })
                    }).catch(console.error);
                }
            }, 80);
        }

        clearInterval(state.interactivePollInterval);
        state.interactivePollInterval = setInterval(async () => {
            if (!state.activeInteractiveSessionId) {
                clearInterval(state.interactivePollInterval);
                return;
            }

            try {
                const res = await fetch(`/api/session/poll?id=${state.activeInteractiveSessionId}`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.output) {
                    if (terminalActivePrompt) {
                        terminalActivePrompt.textContent += data.output;
                    }
                    if (outputScreen) outputScreen.scrollTop = outputScreen.scrollHeight;
                    const inp = document.getElementById('terminalActiveInput');
                    if (inp) inp.focus();
                }

                if (execTime && data.elapsedMs) {
                    execTime.textContent = `${data.elapsedMs} ms`;
                }

                if (data.isDone) {
                    clearInterval(state.interactivePollInterval);
                    state.interactivePollInterval = null;

                    if (terminalHistory && terminalActivePrompt && terminalActivePrompt.textContent) {
                        terminalHistory.textContent += terminalActivePrompt.textContent;
                        terminalActivePrompt.textContent = '';
                    }
                    if (terminalActiveLine) {
                        terminalActiveLine.style.display = 'none';
                    }

                    const isSuccess = (data.exitCode === 0 || data.exitCode === null);
                    if (statusBadge) {
                        statusBadge.textContent = isSuccess ? 'ACCEPTED (TURBO)' : 'EXIT ' + data.exitCode;
                        statusBadge.className = isSuccess ? 'status-badge turbo' : 'status-badge error';
                    }

                    resetRunButtonState();
                    state.activeInteractiveSessionId = null;
                    state.isExecuting = false;
                }
            } catch (err) {
                console.error('Interactive poll error:', err);
            }
        }, 60);
    }

    async function stopInteractiveExecution() {
        const sid = state.activeInteractiveSessionId;
        clearInterval(state.interactivePollInterval);
        state.interactivePollInterval = null;
        state.activeInteractiveSessionId = null;
        state.isExecuting = false;

        resetRunButtonState();

        const terminalActiveLine = document.getElementById('terminalActiveLine');
        const terminalHistory = document.getElementById('terminalHistory');
        if (terminalActiveLine) terminalActiveLine.style.display = 'none';
        if (terminalHistory) {
            terminalHistory.textContent += '\n[Execution stopped by user]';
        }
        if (statusBadge) {
            statusBadge.textContent = 'STOPPED';
            statusBadge.className = 'status-badge error';
        }

        if (sid) {
            try {
                await fetch('/api/session/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: sid })
                });
            } catch (e) {}
        }
        showToast('Execution stopped.', 'info');
    }

    function resetRunButtonState() {
        if (runBtn) {
            runBtn.classList.remove('is-running');
            runBtn.classList.remove('loading');
            const label = runBtn.querySelector('span');
            if (label) label.textContent = 'Run';
            runBtn.title = 'Execute Code (Ctrl + Enter)';
        }
    }

    function handleExecutionError(errorText, code, stdout = '') {
        if (statusBadge) {
            statusBadge.textContent = 'ERROR';
            statusBadge.className = 'status-badge error';
        }
        state.lastErrorOutput = errorText;

        let outputHtml = '';
        if (stdout) {
            outputHtml += `<span class="stdout">${escapeHtml(stdout)}</span>\n`;
        }
        outputHtml += `<div class="stderr">${escapeHtml(errorText)}</div>`;
        if (outputScreen) outputScreen.innerHTML = outputHtml;

        if (terminalPane) terminalPane.classList.add('has-error');
        if (aiAssistBtn) aiAssistBtn.classList.add('pulse-attention');
        if (bannerDebugBtn) bannerDebugBtn.classList.add('pulse-attention');
        if (aiDebugBanner) aiDebugBanner.style.display = 'flex';

        const quickDiagnosis = aiDebugger.smartAnalyze({
            language: state.currentLanguage,
            code,
            errorOutput: state.lastErrorOutput
        });
        if (quickDiagnosis.line) {
            editorManager.highlightErrorLine(quickDiagnosis.line);
        }
        if (quickDiagnosis.fixedCode && quickDiagnosis.fixedCode !== code) {
            state.lastFixedCode = quickDiagnosis.fixedCode;
            if (bannerQuickFixBtn) {
                bannerQuickFixBtn.style.display = 'flex';
                bannerQuickFixBtn.classList.add('pulse-attention');
            }
        }
        resetRunButtonState();
        state.isExecuting = false;
    }

    if (runBtn) {
        runBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (state.activeInteractiveSessionId) {
                stopInteractiveExecution();
                return;
            }
            if (bgCanvas) bgCanvas.burst();
            runBtn.classList.remove('pulse-suggest');
            runCode();
        });
    }

    // Trigger pulse suggest & debounced save on editor change
    editorManager.onDidChangeContent(() => {
        if (runBtn && !state.isExecuting) {
            runBtn.classList.add('pulse-suggest');
        }
        debouncedSaveCurrentFiles();
    });

    // 6. AI Debugger Drawer Logic
    async function openAiDebugger() {
        if (!aiDrawer) return;
        aiDrawer.classList.add('open');
        if (aiErrorBadge) {
            aiErrorBadge.textContent = 'Analyzing...';
            aiErrorBadge.className = 'ai-error-tag';
        }
        if (aiExplanation) aiExplanation.textContent = 'CompilerG AI is analyzing your code and error traceback...';
        if (aiSolutionText) aiSolutionText.textContent = 'Diagnosing fix...';
        if (aiCodeCard) aiCodeCard.style.display = 'none';
        if (applyAiFixBtn) applyAiFixBtn.style.display = 'none';

        const code = editorManager.getCode();
        const errorOutput = state.lastErrorOutput;
        const stdin = stdinInput ? stdinInput.value : '';

        try {
            const analysis = await aiDebugger.debugError({
                language: state.currentLanguage,
                code,
                errorOutput,
                stdin
            });

            if (aiErrorBadge) {
                aiErrorBadge.textContent = analysis.errorType || 'Error Detected';
                aiErrorBadge.className = 'ai-error-tag';
            }
            if (aiExplanation) aiExplanation.textContent = analysis.explanation;
            if (aiSolutionText) aiSolutionText.textContent = analysis.solution;

            if (analysis.line) {
                editorManager.highlightErrorLine(analysis.line);
            }

            if (analysis.fixedCode && analysis.fixedCode !== code) {
                state.lastFixedCode = analysis.fixedCode;
                if (aiFixedCodeSnippet) aiFixedCodeSnippet.textContent = analysis.fixedCode;
                if (aiCodeCard) aiCodeCard.style.display = 'block';
                if (applyAiFixBtn) applyAiFixBtn.style.display = 'flex';
            } else {
                state.lastFixedCode = null;
                if (aiCodeCard) aiCodeCard.style.display = 'none';
                if (applyAiFixBtn) applyAiFixBtn.style.display = 'none';
            }
        } catch (err) {
            if (aiErrorBadge) aiErrorBadge.textContent = 'Analysis Complete';
            if (aiExplanation) aiExplanation.textContent = 'Code execution completed without runtime errors.';
            if (aiSolutionText) aiSolutionText.textContent = 'If you need assistance, click "Explain Code" below.';
        }
    }

    if (bannerDebugBtn) bannerDebugBtn.addEventListener('click', openAiDebugger);
    if (aiAssistBtn) aiAssistBtn.addEventListener('click', openAiDebugger);
    if (closeAiDrawerBtn) closeAiDrawerBtn.addEventListener('click', () => aiDrawer.classList.remove('open'));

    // Instant Quick Fix Action
    if (bannerQuickFixBtn) {
        bannerQuickFixBtn.addEventListener('click', () => {
            if (state.lastFixedCode) {
                editorManager.setCode(state.lastFixedCode);
                editorManager.clearDecorations();
                saveCurrentFiles();
                if (aiDebugBanner) aiDebugBanner.style.display = 'none';
                if (terminalPane) terminalPane.classList.remove('has-error');
                if (aiAssistBtn) aiAssistBtn.classList.remove('pulse-attention');
                bannerQuickFixBtn.style.display = 'none';
                showToast('⚡ Instant fix applied to editor! Re-testing...', 'success');
                runCode();
            }
        });
    }

    if (applyAiFixBtn) {
        applyAiFixBtn.addEventListener('click', () => {
            if (state.lastFixedCode) {
                editorManager.setCode(state.lastFixedCode);
                editorManager.clearDecorations();
                saveCurrentFiles();
                aiDrawer.classList.remove('open');
                if (aiDebugBanner) aiDebugBanner.style.display = 'none';
                if (terminalPane) terminalPane.classList.remove('has-error');
                if (aiAssistBtn) aiAssistBtn.classList.remove('pulse-attention');
                if (bannerQuickFixBtn) bannerQuickFixBtn.style.display = 'none';
                showToast('AI fix applied to editor! Click Run to test.', 'success');
            }
        });
    }

    if (aiExplainBtn) {
        aiExplainBtn.addEventListener('click', async () => {
            if (aiErrorBadge) aiErrorBadge.textContent = 'Code Analysis';
            if (aiExplanation) aiExplanation.textContent = 'Analyzing code logic...';
            if (aiSolutionText) aiSolutionText.textContent = 'Reviewing structure...';
            if (aiCodeCard) aiCodeCard.style.display = 'none';
            if (applyAiFixBtn) applyAiFixBtn.style.display = 'none';

            const result = await aiDebugger.explainCode({
                language: state.currentLanguage,
                code: editorManager.getCode()
            });

            if (aiExplanation) aiExplanation.textContent = result.explanation;
            if (aiSolutionText) aiSolutionText.textContent = 'Code review complete. Modify code or test with Run.';
        });
    }

    // 7. Productivity Buttons
    if (resetCodeBtn) {
        resetCodeBtn.addEventListener('click', () => {
            const langName = window.LANGUAGES[state.currentLanguage]?.name || state.currentLanguage;
            if (confirm(`Reset ${langName} code to starter boilerplate?`)) {
                const boilerplate = window.BOILERPLATES[state.currentLanguage] || '';
                editorManager.setCode(boilerplate);
                editorManager.clearDecorations();
                saveCurrentFiles();
                showToast('Code reset to default template.');
            }
        });
    }

    if (downloadCodeBtn) {
        downloadCodeBtn.addEventListener('click', () => {
            const activeFile = state.files.find(f => f.id === state.activeFileId) || { name: 'code.txt' };
            const code = editorManager.getCode();
            const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = activeFile.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Downloaded ${activeFile.name}`, 'success');
        });
    }

    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editorManager.getCode());
                showToast('Code copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy code.', 'error');
            }
        });
    }

    if (formatCodeBtn) {
        formatCodeBtn.addEventListener('click', () => {
            editorManager.formatCode();
            showToast('Code formatted.');
        });
    }

    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', () => {
            if (outputScreen) outputScreen.innerHTML = '<span style="color: #64748b;">Console cleared.</span>';
            if (aiDebugBanner) aiDebugBanner.style.display = 'none';
            editorManager.clearDecorations();
        });
    }

    // --- Theme System ---
    const themeMetadata = {
        'obsidian': { label: 'Obsidian', icon: '🖤', color: '#10b981' },
        'codedex': { label: 'Midnight Purple', icon: '✨', color: '#a855f7' },
        'tokyo-night': { label: 'Tokyo Night', icon: '🌌', color: '#7aa2f7' },
        'cyberpunk': { label: 'Cyberpunk', icon: '⚡', color: '#ff007f' },
        'dracula': { label: 'Dracula', icon: '🧛', color: '#bd93f9' },
        'one-dark': { label: 'One Dark', icon: '💎', color: '#61afef' },
        'nord': { label: 'Nord Frost', icon: '❄️', color: '#88c0d0' },
        'monokai': { label: 'Monokai Pro', icon: '🌿', color: '#a6e22e' },
        'solarized': { label: 'Solarized', icon: '☀️', color: '#268bd2' },
        'dark': { label: 'Modern Dark', icon: '🌙', color: '#38bdf8' },
        'light': { label: 'Clean Light', icon: '☀️', color: '#2563eb' }
    };

    function applyTheme(themeKey, notify = true) {
        const cleanKey = themeMetadata[themeKey] ? themeKey : 'obsidian';
        document.documentElement.setAttribute('data-theme', cleanKey);
        state.theme = cleanKey;
        localStorage.setItem('compilerg_theme', cleanKey);
        editorManager.setTheme(cleanKey);
        if (bgCanvas) bgCanvas.setTheme(cleanKey);

        const meta = themeMetadata[cleanKey];
        if (themeNameLabel) themeNameLabel.textContent = meta.label;
        if (themeIndicatorDot) {
            themeIndicatorDot.style.background = meta.color;
            themeIndicatorDot.style.boxShadow = `0 0 10px ${meta.color}`;
        }
        if (themeSelectInput) themeSelectInput.value = cleanKey;

        document.querySelectorAll('.theme-option-item').forEach(el => {
            el.classList.toggle('active', el.dataset.theme === cleanKey);
        });

        if (notify) {
            showToast(`Applied ${meta.icon} ${meta.label} theme!`, 'info');
        }
    }

    if (themeToggleBtn && themeDropdownMenu) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdownMenu.classList.toggle('open');
        });

        document.querySelectorAll('.theme-option-item').forEach(item => {
            item.addEventListener('click', () => {
                const selected = item.dataset.theme;
                if (selected) {
                    applyTheme(selected);
                    themeDropdownMenu.classList.remove('open');
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (themeDropdownContainer && !themeDropdownContainer.contains(e.target)) {
                themeDropdownMenu.classList.remove('open');
            }
        });
    }

    if (themeSelectInput) {
        themeSelectInput.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    // Initialize Active Theme
    applyTheme(state.theme, false);

    // 8. Modals & Settings
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (themeSelectInput) themeSelectInput.value = state.theme;
            if (fontSizeSelect) fontSizeSelect.value = state.fontSize;
            if (minimapToggle) minimapToggle.checked = state.minimap;
            if (geminiApiKeyInput) geminiApiKeyInput.value = aiDebugger.getApiKey();
            if (settingsModal) settingsModal.classList.add('open');
        });
    }

    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => {
            editorManager.setFontSize(e.target.value);
            state.fontSize = parseInt(e.target.value, 10);
        });
    }

    if (minimapToggle) {
        minimapToggle.addEventListener('change', (e) => {
            editorManager.toggleMinimap(e.target.checked);
            state.minimap = e.target.checked;
        });
    }

    if (geminiApiKeyInput) {
        geminiApiKeyInput.addEventListener('change', (e) => {
            aiDebugger.setApiKey(e.target.value);
            showToast('Gemini API key saved in browser.', 'success');
        });
    }

    if (shortcutsBtn && shortcutsModal) {
        shortcutsBtn.addEventListener('click', () => {
            shortcutsModal.classList.add('open');
        });
    }

    document.querySelectorAll('.modal-close-btn, .modal-overlay, [data-close]').forEach(el => {
        el.addEventListener('click', (e) => {
            const closeTargetId = el.dataset.close;
            if (closeTargetId) {
                const modal = document.getElementById(closeTargetId);
                if (modal) modal.classList.remove('open');
            } else if (e.target === el || el.classList.contains('modal-close-btn')) {
                if (settingsModal) settingsModal.classList.remove('open');
                if (shortcutsModal) shortcutsModal.classList.remove('open');
                if (newFileModal) newFileModal.classList.remove('open');
                const shareModal = document.getElementById('shareModal');
                const complexityModal = document.getElementById('complexityModal');
                if (shareModal) shareModal.classList.remove('open');
                if (complexityModal) complexityModal.classList.remove('open');
            }
        });
    });

    // 9. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runCode();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (typeof handleSaveTrigger === 'function') {
                handleSaveTrigger();
            } else {
                saveCurrentFiles();
                showToast('Code saved!', 'success');
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            if (aiDrawer) aiDrawer.classList.toggle('open');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (clearConsoleBtn) clearConsoleBtn.click();
        }
        // Alt+Z = Word Wrap Toggle
        if (e.altKey && e.key === 'z') {
            e.preventDefault();
            toggleWordWrap();
        }
        // F11 = Zen Mode
        if (e.key === 'F11') {
            e.preventDefault();
            toggleZenMode();
        }
        // Escape = Exit Zen Mode
        if (e.key === 'Escape' && document.querySelector('.app-container')?.classList.contains('zen-mode')) {
            toggleZenMode(false);
        }
    });

    // ==========================================================================
    // FEATURE 1: Multi-Input Test Cases Runner
    // ==========================================================================
    const addTestCaseBtn = document.getElementById('addTestCaseBtn');
    const runAllTestsBtn = document.getElementById('runAllTestsBtn');
    const testCasesList = document.getElementById('testCasesList');
    const testCasesTabBtn = document.getElementById('testCasesTabBtn');
    let testCases = [];

    function createTestCaseItem(index) {
        return {
            id: 'tc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            input: '',
            expected: '',
            output: null,
            status: null // null, 'running', 'pass', 'fail'
        };
    }

    function renderTestCases() {
        if (!testCasesList) return;
        if (testCases.length === 0) {
            testCases.push(createTestCaseItem(0));
            testCases.push(createTestCaseItem(1));
        }
        testCasesList.innerHTML = '';
        testCases.forEach((tc, i) => {
            const item = document.createElement('div');
            item.className = 'test-case-item';
            item.innerHTML = `
                <div class="test-case-header">
                    <span class="test-case-label">Case ${i + 1}</span>
                    ${tc.status ? `<span class="test-case-badge ${tc.status}">${tc.status === 'pass' ? '✓ PASS' : tc.status === 'fail' ? '✗ FAIL' : '⏳ Running'}</span>` : ''}
                </div>
                <div class="test-case-fields">
                    <div class="test-case-field">
                        <label>Input (STDIN)</label>
                        <textarea data-tc-id="${tc.id}" data-field="input" placeholder="Enter input...">${tc.input}</textarea>
                    </div>
                    <div class="test-case-field">
                        <label>Expected Output</label>
                        <textarea data-tc-id="${tc.id}" data-field="expected" placeholder="Expected output (optional)">${tc.expected}</textarea>
                    </div>
                </div>
                ${tc.output !== null ? `<div class="test-case-output"><strong>Actual Output:</strong>\n${tc.output}</div>` : ''}
                <div class="test-case-actions">
                    <button data-tc-remove="${tc.id}">Remove</button>
                </div>
            `;
            testCasesList.appendChild(item);
        });

        // Wire up events
        testCasesList.querySelectorAll('textarea[data-tc-id]').forEach(ta => {
            ta.addEventListener('input', (e) => {
                const tc = testCases.find(t => t.id === e.target.dataset.tcId);
                if (tc) tc[e.target.dataset.field] = e.target.value;
            });
        });
        testCasesList.querySelectorAll('button[data-tc-remove]').forEach(btn => {
            btn.addEventListener('click', () => {
                testCases = testCases.filter(t => t.id !== btn.dataset.tcRemove);
                renderTestCases();
            });
        });
    }

    if (addTestCaseBtn) {
        addTestCaseBtn.addEventListener('click', () => {
            testCases.push(createTestCaseItem(testCases.length));
            renderTestCases();
        });
    }

    if (testCasesTabBtn) {
        testCasesTabBtn.addEventListener('click', () => {
            switchTab('testcases');
            if (testCases.length === 0) renderTestCases();
        });
    }

    if (runAllTestsBtn) {
        runAllTestsBtn.addEventListener('click', async () => {
            if (state.isExecuting) return;
            saveCurrentFiles();
            const code = editorManager.getCode();
            const langConfig = window.LANGUAGES[state.currentLanguage];
            const filesPayload = state.files.map(f => ({
                name: f.name,
                content: f.id === state.activeFileId ? code : f.content
            }));

            // Mark all as running
            testCases.forEach(tc => { tc.status = 'running'; tc.output = null; });
            renderTestCases();

            // Run all test cases in parallel for maximum speed
            await Promise.all(testCases.map(async (tc) => {
                try {
                    const result = await executor.execute({
                        languageKey: state.currentLanguage,
                        code,
                        stdin: tc.input,
                        files: filesPayload
                    });
                    const actualOutput = (result.stdout || '').trim();
                    tc.output = actualOutput;
                    if (tc.expected.trim() === '') {
                        tc.status = result.isSuccess ? 'pass' : 'fail';
                    } else {
                        tc.status = actualOutput === tc.expected.trim() ? 'pass' : 'fail';
                    }
                } catch (err) {
                    tc.output = 'Error: ' + err.message;
                    tc.status = 'fail';
                }
                renderTestCases();
            }));
            const passed = testCases.filter(t => t.status === 'pass').length;
            showToast(`Tests: ${passed}/${testCases.length} passed`, passed === testCases.length ? 'success' : 'error');
        });
    }

    // Render initial test cases when panel is first opened
    renderTestCases();

    // ==========================================================================
    // FEATURE 2: DSA & Algorithm Snippets Library
    // ==========================================================================
    const snippetsBtn = document.getElementById('snippetsBtn');
    const snippetsDropdownMenu = document.getElementById('snippetsDropdownMenu');
    const snippetsDropdownContainer = document.getElementById('snippetsDropdownContainer');

    function populateSnippets() {
        if (!snippetsDropdownMenu || !window.SNIPPETS) return;
        const snippets = window.SNIPPETS.getForLanguage(state.currentLanguage);
        snippetsDropdownMenu.innerHTML = '';
        snippets.forEach(s => {
            const item = document.createElement('div');
            item.className = 'snippet-item';
            item.innerHTML = `
                <span class="snippet-icon">${s.icon}</span>
                <span class="snippet-name">${s.name}</span>
                <span class="snippet-badge">Insert</span>
            `;
            item.addEventListener('click', () => {
                editorManager.insertAtCursor(s.code);
                snippetsDropdownMenu.classList.remove('open');
                showToast(`Inserted ${s.name} snippet`, 'success');
            });
            snippetsDropdownMenu.appendChild(item);
        });
    }

    if (snippetsBtn) {
        snippetsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            populateSnippets();
            snippetsDropdownMenu.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (snippetsDropdownContainer && !snippetsDropdownContainer.contains(e.target)) {
            if (snippetsDropdownMenu) snippetsDropdownMenu.classList.remove('open');
        }
    });

    // ==========================================================================
    // FEATURE 3: Share Code via Instant URL
    // ==========================================================================
    const shareCodeBtn = document.getElementById('shareCodeBtn');
    const shareModal = document.getElementById('shareModal');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
    const shareStatus = document.getElementById('shareStatus');

    function encodeShare() {
        const code = editorManager.getCode();
        const lang = state.currentLanguage;
        const payload = JSON.stringify({ l: lang, c: code });
        const compressed = btoa(unescape(encodeURIComponent(payload)));
        return compressed;
    }

    function decodeShare(hash) {
        try {
            const decoded = decodeURIComponent(escape(atob(hash)));
            return JSON.parse(decoded);
        } catch (e) {
            return null;
        }
    }

    if (shareCodeBtn) {
        shareCodeBtn.addEventListener('click', () => {
            const encoded = encodeShare();
            const url = window.location.origin + window.location.pathname + '#share=' + encoded;
            if (shareLinkInput) shareLinkInput.value = url;
            if (shareModal) shareModal.classList.add('open');
            if (shareStatus) shareStatus.textContent = '';
        });
    }

    if (copyShareLinkBtn) {
        copyShareLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareLinkInput.value);
                if (shareStatus) shareStatus.textContent = '✓ Link copied to clipboard!';
                showToast('Share link copied!', 'success');
            } catch (e) {
                if (shareStatus) shareStatus.textContent = 'Failed to copy. Select and copy manually.';
            }
        });
    }

    // Load shared code from URL on page load
    function loadSharedCode() {
        const hash = window.location.hash;
        if (hash.startsWith('#share=')) {
            const encoded = hash.substring(7);
            const shared = decodeShare(encoded);
            if (shared && shared.c) {
                if (shared.l && window.LANGUAGES[shared.l]) {
                    switchLanguage(shared.l);
                }
                editorManager.setCode(shared.c);
                saveCurrentFiles();
                showToast('Shared code loaded!', 'success');
                // Clean URL
                history.replaceState(null, '', window.location.pathname);
            }
        }
    }

    // ==========================================================================
    // FEATURE 4: AI Complexity Analyzer (Big-O)
    // ==========================================================================
    const complexityBtn = document.getElementById('complexityBtn');
    const complexityModal = document.getElementById('complexityModal');
    const timeComplexityEl = document.getElementById('timeComplexity');
    const spaceComplexityEl = document.getElementById('spaceComplexity');
    const complexityExplanation = document.getElementById('complexityExplanation');

    if (complexityBtn) {
        complexityBtn.addEventListener('click', () => {
            const code = editorManager.getCode();
            const result = aiDebugger.analyzeComplexity({
                language: state.currentLanguage,
                code
            });
            if (timeComplexityEl) timeComplexityEl.textContent = result.time;
            if (spaceComplexityEl) spaceComplexityEl.textContent = result.space;
            if (complexityExplanation) complexityExplanation.textContent = result.explanation;
            if (complexityModal) complexityModal.classList.add('open');
        });
    }

    // ==========================================================================
    // FEATURE 5: Zen Mode & Word Wrap Toggle
    // ==========================================================================
    const zenModeBtn = document.getElementById('zenModeBtn');
    const wordWrapBtn = document.getElementById('wordWrapBtn');
    let isZenMode = false;
    let isWordWrap = false;

    function toggleZenMode(force) {
        const appContainer = document.querySelector('.app-container');
        if (!appContainer) return;

        isZenMode = force !== undefined ? force : !isZenMode;

        if (isZenMode) {
            appContainer.classList.add('zen-mode');
            // Add exit bar
            let exitBar = document.querySelector('.zen-exit-bar');
            if (!exitBar) {
                exitBar = document.createElement('div');
                exitBar.className = 'zen-exit-bar';
                exitBar.innerHTML = '<span>Zen Mode — Press <kbd>Esc</kbd> or <kbd>F11</kbd> to exit</span><button id="exitZenBtn">Exit Zen</button>';
                document.body.appendChild(exitBar);
                exitBar.querySelector('#exitZenBtn').addEventListener('click', () => toggleZenMode(false));
            }
            exitBar.style.display = 'flex';
            showToast('Zen Mode enabled — distraction-free coding 🧘', 'info');
        } else {
            appContainer.classList.remove('zen-mode');
            const exitBar = document.querySelector('.zen-exit-bar');
            if (exitBar) exitBar.style.display = 'none';
        }
        setTimeout(() => editorManager.layout(), 100);
    }

    function toggleWordWrap() {
        isWordWrap = !isWordWrap;
        editorManager.setWordWrap(isWordWrap);
        if (wordWrapBtn) {
            wordWrapBtn.classList.toggle('active-toggle', isWordWrap);
        }
        showToast(isWordWrap ? 'Word Wrap: ON' : 'Word Wrap: OFF', 'info');
    }

    if (zenModeBtn) {
        zenModeBtn.addEventListener('click', () => toggleZenMode());
    }

    if (wordWrapBtn) {
        wordWrapBtn.addEventListener('click', () => toggleWordWrap());
    }

    // --- Initialize Editor & Multi-File System ---
    const initialLangConfig = window.LANGUAGES[state.currentLanguage] || window.LANGUAGES.python;
    updateFileLabel(initialLangConfig);
    syncLanguageUI(state.currentLanguage);

    const initialFile = loadFilesForLanguage(state.currentLanguage);
    const initialMonacoLang = getMonacoLangFromFilename(initialFile.name);

    // Synchronously mounts fallback editor & launches Monaco in background
    editorManager.initSync(monacoContainer, initialMonacoLang, initialFile.content);

    // Load shared code after editor is ready
    setTimeout(loadSharedCode, 500);

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================================================
    // ONECOMPILER HOMEPAGE CONTROLLER & VIEW ROUTER
    // ==========================================================================
    const homeView = document.getElementById('homeView');
    const editorView = document.getElementById('editorView');
    const editorHomeBtn = document.getElementById('editorHomeBtn');
    const brandLogo = document.getElementById('brandLogo');

    let isRouting = false;

    function showHomeView(scrollSmooth = false) {
        if (isRouting) return;
        isRouting = true;
        try {
            if (homeView) homeView.style.display = 'block';
            if (editorView) editorView.style.display = 'none';
            document.body.classList.remove('in-editor-mode');
            if (window.location.hash !== '#home' && window.location.hash !== '') {
                history.replaceState(null, '', '#home');
            }
            if (scrollSmooth) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } finally {
            isRouting = false;
        }
    }

    function showEditorView(targetLang) {
        if (isRouting) return;
        isRouting = true;
        try {
            if (homeView) homeView.style.display = 'none';
            if (editorView) editorView.style.display = 'flex';
            document.body.classList.add('in-editor-mode');
            if (targetLang && window.LANGUAGES[targetLang]) {
                switchLanguage(targetLang);
            }
            if (window.location.hash !== '#editor') {
                history.replaceState(null, '', '#editor');
            }
            setTimeout(() => {
                if (editorManager) editorManager.layout();
            }, 60);
        } finally {
            isRouting = false;
        }
    }

    // Connect Home navigation in Editor
    if (editorHomeBtn) {
        editorHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHomeView();
        });
    }
    if (brandLogo) {
        brandLogo.addEventListener('click', (e) => {
            e.preventDefault();
            showHomeView();
        });
    }

    // 1. Language Cards Click
    document.querySelectorAll('.lang-card').forEach(card => {
        card.addEventListener('click', () => {
            const lang = card.dataset.lang;
            const langName = card.querySelector('.lang-card-name')?.textContent || lang;
            showEditorView(lang);
            showToast(`Opened ${langName} in CompilerG Editor`, 'success');
        });
    });

    // 2. Search Bar Filter
    const homeSearchInput = document.getElementById('homeSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const langCards = document.querySelectorAll('.lang-card');

    function filterLanguageCards() {
        const query = (homeSearchInput?.value || '').trim().toLowerCase();
        const activePill = document.querySelector('.filter-pill.active');
        const activeCat = activePill?.dataset.cat || 'all';

        if (clearSearchBtn) {
            clearSearchBtn.style.display = query ? 'block' : 'none';
        }

        langCards.forEach(card => {
            const lang = card.dataset.lang || '';
            const cats = (card.dataset.cat || '').split(' ');
            const keywords = (card.dataset.keywords || '').toLowerCase();
            const name = (card.querySelector('.lang-card-name')?.textContent || '').toLowerCase();

            const matchesCategory = activeCat === 'all' || cats.includes(activeCat);
            const matchesQuery = !query || name.includes(query) || keywords.includes(query) || lang.includes(query);

            if (matchesCategory && matchesQuery) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (homeSearchInput) {
        homeSearchInput.addEventListener('input', filterLanguageCards);
    }
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            homeSearchInput.value = '';
            filterLanguageCards();
            homeSearchInput.focus();
        });
    }

    // 3. Category Pills Filter
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterLanguageCards();
        });
    });

    // 4. Navbar Buttons
    const navOpenEditorBtn = document.getElementById('navOpenEditorBtn');
    const navChallengesBtn = document.getElementById('navChallengesBtn');
    const navTutorialsBtn = document.getElementById('navTutorialsBtn');
    const navDocsBtn = document.getElementById('navDocsBtn');
    const navArticlesBtn = document.getElementById('navArticlesBtn');
    const navSignInBtn = document.getElementById('navSignInBtn');
    const navSignUpBtn = document.getElementById('navSignUpBtn');

    if (navOpenEditorBtn) navOpenEditorBtn.addEventListener('click', () => showEditorView());
    if (navChallengesBtn) navChallengesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView();
        switchTab('testcases');
        showToast('Switched to Test Cases Runner', 'info');
    });
    if (navDocsBtn) navDocsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const featSection = document.querySelector('.home-features-section');
        if (featSection) featSection.scrollIntoView({ behavior: 'smooth' });
    });
    if (navArticlesBtn) navArticlesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const showcaseSection = document.querySelector('.home-showcase-section');
        if (showcaseSection) showcaseSection.scrollIntoView({ behavior: 'smooth' });
    });

    // 5. Features Trio Cards
    const featureChallengesCard = document.getElementById('featureChallengesCard');
    const featureTurboCard = document.getElementById('featureTurboCard');
    const featureWorkflowsCard = document.getElementById('featureWorkflowsCard');

    if (featureChallengesCard) featureChallengesCard.addEventListener('click', () => {
        showEditorView();
        switchTab('testcases');
        showToast('Explore Coding Challenges & Test Cases', 'info');
    });
    if (featureTurboCard) featureTurboCard.addEventListener('click', () => {
        showEditorView();
        showToast('Turbo Engine Active: Local MinGW G++ & Java 21', 'success');
    });
    if (featureWorkflowsCard) featureWorkflowsCard.addEventListener('click', () => {
        showEditorView();
        const snipBtn = document.getElementById('snippetsBtn');
        if (snipBtn) snipBtn.click();
    });

    // 6. Showcase CTA Buttons
    const showcaseOpenEditorBtn = document.getElementById('showcaseOpenEditorBtn');
    const showcaseTestCasesBtn = document.getElementById('showcaseTestCasesBtn');

    if (showcaseOpenEditorBtn) showcaseOpenEditorBtn.addEventListener('click', () => showEditorView());
    if (showcaseTestCasesBtn) showcaseTestCasesBtn.addEventListener('click', () => {
        showEditorView();
        switchTab('testcases');
        showToast('Multi-Input Test Cases Runner', 'info');
    });

    // 7. Interactive Mockup "Run Live Demo"
    const mockupRunDemoBtn = document.getElementById('mockupRunDemoBtn');
    const mockupStatus = document.getElementById('mockupStatus');
    const mockupTerminalBody = document.getElementById('mockupTerminalBody');

    if (mockupRunDemoBtn) {
        mockupRunDemoBtn.addEventListener('click', () => {
            if (mockupStatus) {
                mockupStatus.textContent = 'RUNNING';
                mockupStatus.style.background = 'rgba(234, 179, 8, 0.2)';
                mockupStatus.style.color = '#facc15';
            }
            if (mockupTerminalBody) {
                mockupTerminalBody.innerHTML = '<span class="term-dim">$ compilerg run solution.py --turbo</span><span style="color:#94a3b8;">Compiling and running with Local Turbo Engine...</span>';
            }

            setTimeout(() => {
                if (mockupStatus) {
                    mockupStatus.textContent = 'ACCEPTED';
                    mockupStatus.style.background = 'rgba(34, 197, 94, 0.15)';
                    mockupStatus.style.color = '#4ade80';
                }
                if (mockupTerminalBody) {
                    mockupTerminalBody.innerHTML = `
                        <span class="term-dim">$ compilerg run solution.py --turbo</span>
                        <span class="term-out">Test 1: [0, 1]</span>
                        <span class="term-out">Test 2: [1, 2]</span>
                        <span class="term-success">✓ Process completed with exit code 0 (18ms)</span>
                        <span class="term-info">⚡ Engine: Local Turbo Python | Memory: 14 KB</span>
                    `;
                }
                showToast('Demo executed in 18ms with Turbo Engine!', 'success');
            }, 400);
        });
    }

    // 8. Showcase 6 Feature Tiles
    const tileSubSecond = document.getElementById('tileSubSecond');
    const tileMultiPage = document.getElementById('tileMultiPage');
    const tileTestCases = document.getElementById('tileTestCases');
    const tileBigO = document.getElementById('tileBigO');
    const tileShare = document.getElementById('tileShare');
    const tileZen = document.getElementById('tileZen');

    if (tileSubSecond) tileSubSecond.addEventListener('click', () => {
        showEditorView();
        showToast('Sub-second Local MinGW & Java 21 engine ready', 'success');
    });
    if (tileMultiPage) tileMultiPage.addEventListener('click', () => {
        showEditorView();
        showToast('Multi-page tabs active in toolbar', 'info');
    });
    if (tileTestCases) tileTestCases.addEventListener('click', () => {
        showEditorView();
        switchTab('testcases');
    });
    if (tileBigO) tileBigO.addEventListener('click', () => {
        showEditorView();
        const bigOBtn = document.getElementById('analyzeBigOBtn');
        if (bigOBtn) bigOBtn.click();
    });
    if (tileShare) tileShare.addEventListener('click', () => {
        showEditorView();
        const shareBtn = document.getElementById('shareCodeBtn');
        if (shareBtn) shareBtn.click();
    });
    if (tileZen) tileZen.addEventListener('click', () => {
        showEditorView();
        toggleZenMode(true);
    });

    // 9. Footer Links
    document.querySelectorAll('.footer-lang-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = link.dataset.lang;
            showEditorView(lang);
        });
    });

    const footerChallengesLink = document.getElementById('footerChallengesLink');
    if (footerChallengesLink) footerChallengesLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView();
        switchTab('testcases');
    });

    const footerSnippetsLink = document.getElementById('footerSnippetsLink');
    if (footerSnippetsLink) footerSnippetsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView();
        const snipBtn = document.getElementById('snippetsBtn');
        if (snipBtn) snipBtn.click();
    });

    const footerBigOLink = document.getElementById('footerBigOLink');
    if (footerBigOLink) footerBigOLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView();
        const bigOBtn = document.getElementById('analyzeBigOBtn');
        if (bigOBtn) bigOBtn.click();
    });

    const footerShareLink = document.getElementById('footerShareLink');
    if (footerShareLink) footerShareLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView();
        const shareBtn = document.getElementById('shareCodeBtn');
        if (shareBtn) shareBtn.click();
    });

    const footerZenLink = document.getElementById('footerZenLink');
    if (footerZenLink) footerZenLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView();
        toggleZenMode(true);
    });

    const footerWebLink = document.getElementById('footerWebLink');
    if (footerWebLink) footerWebLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditorView('html');
    });

    const footerDocsLink = document.getElementById('footerDocsLink');
    if (footerDocsLink) footerDocsLink.addEventListener('click', (e) => {
        e.preventDefault();
        openTutorialsModal();
    });

    const footerTutorialsLink = document.getElementById('footerTutorialsLink');
    if (footerTutorialsLink) footerTutorialsLink.addEventListener('click', (e) => {
        e.preventDefault();
        openTutorialsModal();
    });

    const footerSignInLink = document.getElementById('footerSignInLink');
    if (footerSignInLink) footerSignInLink.addEventListener('click', (e) => {
        e.preventDefault();
        openAuthModal('signin');
    });

    const footerPrivacyLink = document.getElementById('footerPrivacyLink');
    if (footerPrivacyLink) footerPrivacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Privacy: CompilerG does not store your private code permanently.', 'info');
    });

    const footerTermsLink = document.getElementById('footerTermsLink');
    if (footerTermsLink) footerTermsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Terms: CompilerG is free open-source software for developers.', 'info');
    });

    // 10. Auth Modal (Sign In / Sign Up)
    const authModal = document.getElementById('authModal');
    const authModalTitle = document.getElementById('authModalTitle');
    const authTabSignIn = document.getElementById('authTabSignIn');
    const authTabSignUp = document.getElementById('authTabSignUp');
    const authSubmitLabel = document.getElementById('authSubmitLabel');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authDemoGoogle = document.getElementById('authDemoGoogle');
    const authDemoGithub = document.getElementById('authDemoGithub');

    function openAuthModal(mode = 'signin') {
        if (!authModal) return;
        authModal.classList.add('open');
        if (mode === 'signup') {
            authTabSignUp.classList.add('active');
            authTabSignIn.classList.remove('active');
            if (authModalTitle) authModalTitle.textContent = 'Create your CompilerG Account';
            if (authSubmitLabel) authSubmitLabel.textContent = 'Create Account';
        } else {
            authTabSignIn.classList.add('active');
            authTabSignUp.classList.remove('active');
            if (authModalTitle) authModalTitle.textContent = 'Welcome back to CompilerG';
            if (authSubmitLabel) authSubmitLabel.textContent = 'Sign In';
        }
    }

    if (navSignInBtn) navSignInBtn.addEventListener('click', () => openAuthModal('signin'));
    if (navSignUpBtn) navSignUpBtn.addEventListener('click', () => openAuthModal('signup'));

    if (authTabSignIn) authTabSignIn.addEventListener('click', () => openAuthModal('signin'));
    if (authTabSignUp) authTabSignUp.addEventListener('click', () => openAuthModal('signup'));

    // Auth form, Google, and GitHub sign-in are now handled by js/firebase-auth.js
    // (Real Firebase Authentication with Google & GitHub OAuth)

    // ── User Auth & Cloud Auto-Save Sync Listener ────────────────────────────
    window.addEventListener('compilerg:user-change', async (e) => {
        const user = e.detail?.user;
        if (user) {
            // 1. Save whatever is currently in the editor to this user
            saveCurrentFiles();

            // 2. Fetch all saved codes from server backend (if running)
            try {
                const resp = await fetch(`/api/user/get-all-codes?uid=${encodeURIComponent(user.uid)}`);
                if (resp.ok) {
                    const res = await resp.json();
                    if (res.found && res.codes) {
                        for (const [lang, item] of Object.entries(res.codes)) {
                            if (item.files) {
                                localStorage.setItem(`compilerg_u_${user.uid}_files_${lang}`, JSON.stringify(item.files));
                            }
                            if (item.code) {
                                localStorage.setItem(`compilerg_u_${user.uid}_code_${lang}`, item.code);
                            }
                        }
                    }
                }
            } catch (err) {
                // Offline or static host — localStorage handles it seamlessly
            }

            // 3. Reload files for current active language so user's saved code appears
            const activeFile = loadFilesForLanguage(state.currentLanguage);
            if (activeFile) {
                editorManager.setLanguage(getMonacoLangFromFilename(activeFile.name));
                editorManager.setCode(activeFile.content || '');
            }

            updateAutoSaveStatus('saved');
            showToast(`Cloud auto-save enabled for ${user.displayName || 'your account'}! ☁️`, 'success');
        } else {
            updateAutoSaveStatus('saved');
        }
    });

    // 11. Tutorials Modal
    const tutorialsModal = document.getElementById('tutorialsModal');
    const tutContent = document.getElementById('tutContent');
    const tutOpenInEditorBtn = document.getElementById('tutOpenInEditorBtn');
    let currentTutLang = 'py';

    const TUTORIAL_DATA = {
        py: `# Python 3 Cheatsheet & Essentials
# 1. Variables & Types
name: str = "CompilerG"
count: int = 100
pi: float = 3.14159

# 2. Lists & Comprehensions
squares = [x**2 for x in range(10)]

# 3. Functions & Type Hints
def solve(nums: list[int]) -> int:
    return sum(nums)

# 4. Fast I/O for DSA
import sys
input = sys.stdin.readline
print("Python 3 Turbo Engine Ready!")`,
        cpp: `// C++ (MinGW GCC 14) Cheatsheet
#include <iostream>
#include <vector>
#include <algorithm>
#include <map>
using namespace std;

// Fast I/O for Competitive Programming
void fast_io() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
}

int main() {
    fast_io();
    vector<int> v = {5, 2, 8, 1, 9};
    sort(v.begin(), v.end());
    cout << "Sorted C++ Vector: ";
    for (int x : v) cout << x << " ";
    cout << endl;
    return 0;
}`,
        java: `// Java (JDK 21) Cheatsheet
import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Fast Collection operations
        List<String> list = new ArrayList<>(Arrays.asList("CompilerG", "Turbo", "Engine"));
        System.out.println("Java 21 List: " + list);
        
        // HashMap
        Map<String, Integer> map = new HashMap<>();
        map.put("ExecutionMs", 50);
        System.out.println("Map: " + map);
    }
}`,
        js: `// JavaScript (Node.js 22) Cheatsheet
// 1. Modern ESNext Array Methods
const nums = [1, 2, 3, 4, 5];
const doubled = nums.map(n => n * 2);

// 2. Destructuring & Spread
const [first, ...rest] = nums;

// 3. Async/Await
async function fetchData() {
    return { status: "Turbo Accepted", time: "12ms" };
}

fetchData().then(console.log);`,
        c: `// C (MinGW GCC) Cheatsheet
#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 5;
    int *arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) arr[i] = (i + 1) * 10;
    
    printf("C Dynamic Array: ");
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
    
    free(arr);
    return 0;
}`
    };

    function openTutorialsModal() {
        if (!tutorialsModal) return;
        tutorialsModal.classList.add('open');
        renderTutContent('py');
    }

    function renderTutContent(lang) {
        currentTutLang = lang;
        document.querySelectorAll('.tut-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tut === lang);
        });
        if (tutContent) {
            tutContent.textContent = TUTORIAL_DATA[lang] || TUTORIAL_DATA.py;
        }
    }

    if (navTutorialsBtn) navTutorialsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openTutorialsModal();
    });

    document.querySelectorAll('.tut-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            renderTutContent(btn.dataset.tut);
        });
    });

    if (tutOpenInEditorBtn) {
        tutOpenInEditorBtn.addEventListener('click', () => {
            tutorialsModal.classList.remove('open');
            const target = currentTutLang === 'py' ? 'python' : currentTutLang;
            showEditorView(target);
            editorManager.setCode(TUTORIAL_DATA[currentTutLang]);
            showToast(`Loaded ${currentTutLang.toUpperCase()} cheatsheet in Editor`, 'success');
        });
    }

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.close;
            const targetModal = document.getElementById(targetId);
            if (targetModal) targetModal.classList.remove('open');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ONECOMPILER-STYLE SAVE & MY CODES SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    const saveCodeModal = document.getElementById('saveCodeModal');
    const closeSaveCodeModal = document.getElementById('closeSaveCodeModal');
    const cancelSaveCodeBtn = document.getElementById('cancelSaveCodeBtn');
    const openSaveModalBtn = document.getElementById('openSaveModalBtn');
    const saveCodeForm = document.getElementById('saveCodeForm');
    const saveCodeTitle = document.getElementById('saveCodeTitle');
    const saveCodeDesc = document.getElementById('saveCodeDesc');
    const saveCodeTags = document.getElementById('saveCodeTags');
    const saveCodeVisibilityGroup = document.getElementById('saveCodeVisibilityGroup');

    const myCodesModal = document.getElementById('myCodesModal');
    const closeMyCodesModal = document.getElementById('closeMyCodesModal');
    const openMyCodesBtn = document.getElementById('openMyCodesBtn');
    const homeNavMyCodesBtn = document.getElementById('homeNavMyCodesBtn');
    const myCodesBadge = document.getElementById('myCodesBadge');
    const myCodesSearchInput = document.getElementById('myCodesSearchInput');
    const myCodesLangFilter = document.getElementById('myCodesLangFilter');
    const myCodesNewBtn = document.getElementById('myCodesNewBtn');
    const myCodesList = document.getElementById('myCodesList');
    const myCodesTotalCount = document.getElementById('myCodesTotalCount');
    const exportAllCodesJsonBtn = document.getElementById('exportAllCodesJsonBtn');

    let currentSaveVisibility = 'public';
    state.activeSnippetId = null;

    function getStorageKey(uid = null) {
        if (!uid && window.currentUser && window.currentUser.uid) {
            uid = window.currentUser.uid;
        }
        return uid ? `compilerg_u_${uid}_snippets_v2` : `compilerg_guest_snippets_v2`;
    }

    function getAllSnippets() {
        const list = [];
        const seen = new Set();
        
        // 1. Current user / Guest storage
        const currentKey = getStorageKey();
        try {
            const raw = localStorage.getItem(currentKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        if (item && item.id && !seen.has(item.id)) {
                            seen.add(item.id);
                            list.push(item);
                        }
                    });
                }
            }
        } catch (e) {}

        // 2. Global storage for backward compatibility or guest fallback
        try {
            const rawGlobal = localStorage.getItem('compilerg_saved_snippets_v2');
            if (rawGlobal) {
                const parsedGlobal = JSON.parse(rawGlobal);
                if (Array.isArray(parsedGlobal)) {
                    parsedGlobal.forEach(item => {
                        if (item && item.id && !seen.has(item.id)) {
                            seen.add(item.id);
                            list.push(item);
                        }
                    });
                }
            }
        } catch (e) {}

        // Sort descending by updatedAt
        list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        return list;
    }

    function saveSnippetToStorage(snippet) {
        const snippets = getAllSnippets();
        const existingIdx = snippets.findIndex(s => s.id === snippet.id);
        if (existingIdx >= 0) {
            snippets[existingIdx] = snippet;
        } else {
            snippets.unshift(snippet);
        }

        const jsonStr = JSON.stringify(snippets);
        const currentKey = getStorageKey();
        try {
            localStorage.setItem(currentKey, jsonStr);
            localStorage.setItem('compilerg_saved_snippets_v2', jsonStr);
        } catch (e) {}

        // Cloud sync to server if running
        if (window.currentUser && window.currentUser.uid) {
            fetch('/api/user/save-snippet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snippet)
            }).catch(() => {});
        }

        updateMyCodesBadge();
    }

    function deleteSnippetFromStorage(id) {
        let snippets = getAllSnippets();
        snippets = snippets.filter(s => s.id !== id);
        const jsonStr = JSON.stringify(snippets);
        const currentKey = getStorageKey();
        try {
            localStorage.setItem(currentKey, jsonStr);
            localStorage.setItem('compilerg_saved_snippets_v2', jsonStr);
        } catch (e) {}

        if (state.activeSnippetId === id) {
            state.activeSnippetId = null;
        }

        if (window.currentUser && window.currentUser.uid) {
            fetch('/api/user/delete-snippet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, uid: window.currentUser.uid })
            }).catch(() => {});
        }

        updateMyCodesBadge();
    }

    function updateMyCodesBadge() {
        const count = getAllSnippets().length;
        if (myCodesBadge) {
            myCodesBadge.textContent = count;
        }
        if (myCodesTotalCount) {
            myCodesTotalCount.textContent = `${count} saved code${count === 1 ? '' : 's'}`;
        }
    }

    function detectSmartTitle() {
        const code = editorManager.getCode();
        const lines = code.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 5);
        for (const line of lines) {
            if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('#') || line.startsWith('*')) {
                const cleaned = line.replace(/^(\/\/|\/\*|\*|\*\/|#)+\s*/, '').trim();
                if (cleaned.length > 2 && cleaned.length < 50 && !cleaned.toLowerCase().includes('include') && !cleaned.toLowerCase().includes('import')) {
                    return cleaned;
                }
            }
        }
        const langObj = window.LANGUAGES ? window.LANGUAGES[state.currentLanguage] : null;
        const langName = langObj ? langObj.name : state.currentLanguage.toUpperCase();
        return `My ${langName} Program`;
    }

    function openSaveModal() {
        if (!saveCodeModal) return;
        
        if (state.activeSnippetId) {
            const snippets = getAllSnippets();
            const curr = snippets.find(s => s.id === state.activeSnippetId);
            if (curr) {
                if (saveCodeTitle) saveCodeTitle.value = curr.title || '';
                if (saveCodeDesc) saveCodeDesc.value = curr.description || '';
                if (saveCodeTags) saveCodeTags.value = (curr.tags || []).join(', ');
                currentSaveVisibility = curr.visibility || 'public';
            }
        } else {
            if (saveCodeTitle) saveCodeTitle.value = detectSmartTitle();
            if (saveCodeDesc) saveCodeDesc.value = '';
            if (saveCodeTags) saveCodeTags.value = state.currentLanguage;
            currentSaveVisibility = 'public';
        }

        if (saveCodeVisibilityGroup) {
            saveCodeVisibilityGroup.querySelectorAll('.vis-pill').forEach(pill => {
                pill.classList.toggle('active', pill.dataset.vis === currentSaveVisibility);
            });
        }

        saveCodeModal.classList.add('open');
        setTimeout(() => {
            if (saveCodeTitle) {
                saveCodeTitle.focus();
                saveCodeTitle.select();
            }
        }, 100);
    }

    window.handleSaveTrigger = function() {
        if (state.activeSnippetId) {
            const snippets = getAllSnippets();
            const curr = snippets.find(s => s.id === state.activeSnippetId);
            if (curr) {
                curr.code = editorManager.getCode();
                curr.files = JSON.parse(JSON.stringify(state.files || []));
                curr.updatedAt = new Date().toISOString();
                saveSnippetToStorage(curr);
                showToast(`✓ Updated "${curr.title}"!`, 'success');
                updateAutoSaveStatus('saved');
                return;
            }
        }
        openSaveModal();
    };

    function formatTimeAgo(isoStr) {
        if (!isoStr) return 'Just now';
        const sec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
        if (sec < 60) return 'Just now';
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
        if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
        return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function renderMyCodesList() {
        if (!myCodesList) return;
        const snippets = getAllSnippets();
        const search = (myCodesSearchInput?.value || '').trim().toLowerCase();
        const langFilter = myCodesLangFilter?.value || 'all';

        if (myCodesLangFilter) {
            const currentVal = myCodesLangFilter.value;
            const uniqueLangs = Array.from(new Set(snippets.map(s => s.language).filter(Boolean)));
            myCodesLangFilter.innerHTML = '<option value="all">All Languages</option>';
            uniqueLangs.sort().forEach(lang => {
                const opt = document.createElement('option');
                opt.value = lang;
                const langName = window.LANGUAGES && window.LANGUAGES[lang] ? window.LANGUAGES[lang].name : lang.toUpperCase();
                opt.textContent = langName;
                myCodesLangFilter.appendChild(opt);
            });
            if (uniqueLangs.includes(currentVal)) {
                myCodesLangFilter.value = currentVal;
            }
        }

        const filtered = snippets.filter(s => {
            if (langFilter !== 'all' && s.language !== langFilter) return false;
            if (search) {
                const inTitle = (s.title || '').toLowerCase().includes(search);
                const inDesc = (s.description || '').toLowerCase().includes(search);
                const inLang = (s.language || '').toLowerCase().includes(search);
                const inTags = (s.tags || []).some(t => t.toLowerCase().includes(search));
                if (!inTitle && !inDesc && !inLang && !inTags) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            myCodesList.innerHTML = `
                <div class="my-codes-empty-state">
                    <div class="my-codes-empty-icon">💾</div>
                    <div class="my-codes-empty-title">${search || langFilter !== 'all' ? 'No matching codes found' : 'No saved codes yet'}</div>
                    <p style="font-size: 0.85rem; color: #64748b; margin-top: 6px;">Click <strong>Save</strong> on the top bar or press <strong>Ctrl+S</strong> to save your first program!</p>
                </div>
            `;
            return;
        }

        myCodesList.innerHTML = '';
        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'my-code-card';
            card.dataset.id = item.id;

            const langObj = window.LANGUAGES ? window.LANGUAGES[item.language] : null;
            const langName = langObj ? langObj.name : (item.language || '').toUpperCase();
            const visIcon = item.visibility === 'private' ? '🔒' : (item.visibility === 'unlisted' ? '🔗' : '🌐');
            const previewText = item.description || (item.code ? item.code.slice(0, 110).replace(/\s+/g, ' ') : 'No description provided');
            const timeAgo = formatTimeAgo(item.updatedAt || item.createdAt);

            const tagsHtml = (item.tags || []).slice(0, 3).map(t => `<span class="my-code-tag-pill">${escapeHtml(t)}</span>`).join('');

            card.innerHTML = `
                <div>
                    <div class="my-code-card-header">
                        <span class="my-code-lang-badge">${langObj?.icon || '⚡'} ${escapeHtml(langName)}</span>
                        <span class="my-code-vis-icon" title="Visibility: ${item.visibility || 'public'}">${visIcon}</span>
                    </div>
                    <h4 class="my-code-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
                    <p class="my-code-desc">${escapeHtml(previewText)}</p>
                    ${tagsHtml ? `<div class="my-code-tags-row">${tagsHtml}</div>` : ''}
                </div>
                <div class="my-code-footer">
                    <span class="my-code-date">${timeAgo}</span>
                    <div class="my-code-actions">
                        <button class="my-code-btn-open" data-action="open" data-id="${item.id}">Open</button>
                        <button class="my-code-btn-del" data-action="delete" data-id="${item.id}" title="Delete Code">🗑</button>
                    </div>
                </div>
            `;

            // Clicking card or Open button opens the code
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="delete"]')) return;
                loadSnippetIntoEditor(item);
            });

            const openBtn = card.querySelector('[data-action="open"]');
            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadSnippetIntoEditor(item);
                });
            }

            const delBtn = card.querySelector('[data-action="delete"]');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                        deleteSnippetFromStorage(item.id);
                        renderMyCodesList();
                        showToast(`Deleted "${item.title}"`, 'info');
                    }
                });
            }

            myCodesList.appendChild(card);
        });
    }

    function loadSnippetIntoEditor(snippet) {
        if (!snippet) return;
        try {
            // 1. Sync language state and UI
            const targetLang = snippet.language;
            if (targetLang && window.LANGUAGES && window.LANGUAGES[targetLang]) {
                state.currentLanguage = targetLang;
                localStorage.setItem('compilerg_lang', targetLang);
                updateFileLabel(window.LANGUAGES[targetLang]);
                syncLanguageUI(targetLang);
            }

            // 2. Restore multi-files or single code
            if (snippet.files && Array.isArray(snippet.files) && snippet.files.length > 0) {
                state.files = JSON.parse(JSON.stringify(snippet.files));
                state.activeFileId = state.files[0].id;
            } else {
                const config = (window.LANGUAGES && window.LANGUAGES[state.currentLanguage]) || { filename: 'main.py' };
                state.files = [{
                    id: 'main',
                    name: config.filename || 'main',
                    content: snippet.code || '',
                    isMain: true
                }];
                state.activeFileId = 'main';
            }

            renderFileTabs();

            // 3. Mount code in editor
            const activeFile = state.files.find(f => f.id === state.activeFileId) || state.files[0];
            const monacoLang = getMonacoLangFromFilename(activeFile.name);
            editorManager.setLanguage(monacoLang);
            editorManager.setCode(activeFile.content || snippet.code || '');
            editorManager.clearDecorations();

            // 4. Update active snippet tracker
            state.activeSnippetId = snippet.id;
            saveCurrentFiles();

            // 5. Ensure editor view is visible
            showEditorView();

            // 6. Close modal
            if (myCodesModal) myCodesModal.classList.remove('open');
            showToast(`Loaded "${snippet.title}"! 🚀`, 'success');
        } catch (err) {
            console.error('Failed to load snippet:', err);
            showToast('Could not load snippet into editor', 'error');
        }
    }

    function openMyCodesModal() {
        if (!myCodesModal) return;
        renderMyCodesList();
        myCodesModal.classList.add('open');
        setTimeout(() => {
            if (myCodesSearchInput) myCodesSearchInput.focus();
        }, 100);
    }

    // Modal Triggers
    if (openSaveModalBtn) {
        openSaveModalBtn.addEventListener('click', () => {
            openSaveModal();
        });
    }


    if (closeSaveCodeModal) {
        closeSaveCodeModal.addEventListener('click', () => {
            if (saveCodeModal) saveCodeModal.classList.remove('open');
        });
    }

    if (cancelSaveCodeBtn) {
        cancelSaveCodeBtn.addEventListener('click', () => {
            if (saveCodeModal) saveCodeModal.classList.remove('open');
        });
    }

    if (openMyCodesBtn) {
        openMyCodesBtn.addEventListener('click', openMyCodesModal);
    }

    if (homeNavMyCodesBtn) {
        homeNavMyCodesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openMyCodesModal();
        });
    }

    if (closeMyCodesModal) {
        closeMyCodesModal.addEventListener('click', () => {
            if (myCodesModal) myCodesModal.classList.remove('open');
        });
    }

    if (saveCodeVisibilityGroup) {
        saveCodeVisibilityGroup.querySelectorAll('.vis-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                saveCodeVisibilityGroup.querySelectorAll('.vis-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentSaveVisibility = pill.dataset.vis || 'public';
            });
        });
    }

    if (saveCodeForm) {
        saveCodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = (saveCodeTitle?.value || '').trim();
            if (!title) {
                showToast('Please enter a title for your code.', 'warning');
                return;
            }
            const desc = (saveCodeDesc?.value || '').trim();
            const tagsRaw = (saveCodeTags?.value || '').trim();
            const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [state.currentLanguage];

            const existingSnippets = getAllSnippets();
            const existing = state.activeSnippetId ? existingSnippets.find(s => s.id === state.activeSnippetId) : null;

            const snippet = {
                id: state.activeSnippetId || ('cg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
                title: title,
                description: desc,
                tags: tags,
                visibility: currentSaveVisibility,
                language: state.currentLanguage,
                code: editorManager.getCode(),
                files: JSON.parse(JSON.stringify(state.files || [])),
                createdAt: existing?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                uid: (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : 'guest',
                userEmail: (window.currentUser && window.currentUser.email) ? window.currentUser.email : ''
            };

            saveSnippetToStorage(snippet);
            state.activeSnippetId = snippet.id;
            saveCurrentFiles();

            if (saveCodeModal) saveCodeModal.classList.remove('open');
            showToast(`🎉 "${title}" saved to your account!`, 'success');
        });
    }

    if (myCodesSearchInput) {
        myCodesSearchInput.addEventListener('input', renderMyCodesList);
    }

    if (myCodesLangFilter) {
        myCodesLangFilter.addEventListener('change', renderMyCodesList);
    }

    if (myCodesNewBtn) {
        myCodesNewBtn.addEventListener('click', () => {
            if (confirm('Start a new blank code workspace?')) {
                state.activeSnippetId = null;
                resetCodeToStarter();
                if (myCodesModal) myCodesModal.classList.remove('open');
                showEditorView();
                showToast('New code workspace created!', 'info');
            }
        });
    }

    if (exportAllCodesJsonBtn) {
        exportAllCodesJsonBtn.addEventListener('click', () => {
            const snippets = getAllSnippets();
            if (snippets.length === 0) {
                showToast('No saved codes to export.', 'info');
                return;
            }
            const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compilerg_my_codes_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Exported ${snippets.length} saved code(s) as JSON! 📥`, 'success');
        });
    }

    // Connect user area click to open My Codes
    const editorUserAreaEl = document.getElementById('editorUserArea');
    if (editorUserAreaEl) {
        editorUserAreaEl.style.cursor = 'pointer';
        editorUserAreaEl.title = 'Click to view My Saved Codes';
        editorUserAreaEl.addEventListener('click', openMyCodesModal);
    }

    // Connect auth change to badge update & sync
    window.addEventListener('compilerg:user-change', async (e) => {
        updateMyCodesBadge();
        const user = e.detail?.user;
        if (user && user.uid) {
            // Fetch saved snippets from backend if server running
            try {
                const res = await fetch(`/api/user/snippets?uid=${encodeURIComponent(user.uid)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.found && Array.isArray(data.snippets)) {
                        const local = getAllSnippets();
                        const merged = [...data.snippets];
                        local.forEach(loc => {
                            if (!merged.some(m => m.id === loc.id)) {
                                merged.push(loc);
                            }
                        });
                        localStorage.setItem(getStorageKey(user.uid), JSON.stringify(merged));
                        updateMyCodesBadge();
                    }
                }
            } catch (err) {}
        }
    });

    updateMyCodesBadge();

    // 12. Hash Routing
    function handleRouting() {
        if (isRouting) return;
        const hash = window.location.hash || '';
        if (hash.startsWith('#code=') || hash.startsWith('#share=')) {
            showEditorView();
            loadSharedCode();
        } else if (hash === '#editor' || hash.startsWith('#editor')) {
            showEditorView();
        } else if (hash === '#challenges') {
            showEditorView();
            switchTab('testcases');
        } else if (hash === '#tutorials') {
            openTutorialsModal();
        } else if (hash === '#my-codes' || hash === '#mycodes' || hash === '#saved') {
            openMyCodesModal();
        } else if (hash === '#docs') {
            const featSection = document.querySelector('.home-features-section');
            if (featSection) featSection.scrollIntoView({ behavior: 'smooth' });
        } else if (hash === '#articles' || hash === '#features') {
            const showcaseSection = document.querySelector('.home-showcase-section');
            if (showcaseSection) showcaseSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            showHomeView();
        }
    }

    const homeBrandLink = document.querySelector('.home-brand');
    if (homeBrandLink) {
        homeBrandLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const creatorEmailLink = document.getElementById('creatorEmailLink');
    if (creatorEmailLink) {
        creatorEmailLink.addEventListener('click', () => {
            showToast('Opening Gmail composer for arpitb496@gmail.com...', 'info');
        });
    }

    window.addEventListener('hashchange', handleRouting);
    handleRouting();

});
