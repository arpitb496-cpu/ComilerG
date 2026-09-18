/**
 * CompilerG - Application Controller
 * High-speed multi-language IDE controller managing Monaco editor,
 * local & cloud code execution, multi-file/page tabs, AI debugging, theme engine, and split-pane layout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const rawSavedTheme = localStorage.getItem('compilerg_theme') || 'obsidian';
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
        activeFileId: null
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

    // --- Multi-File Persistence & Management ---
    function loadFilesForLanguage(langKey) {
        const config = window.LANGUAGES[langKey] || window.LANGUAGES.python;
        const savedFilesJson = localStorage.getItem(`compilerg_files_${langKey}`);
        let files = [];

        if (savedFilesJson) {
            try {
                files = JSON.parse(savedFilesJson);
            } catch (e) {
                files = [];
            }
        }

        if (!files || files.length === 0) {
            const legacyCode = localStorage.getItem(`compilerg_code_${langKey}`) || window.BOILERPLATES[langKey] || '';
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
        return files[0];
    }

    let saveDebounceTimer = null;
    function debouncedSaveCurrentFiles() {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(() => {
            saveCurrentFiles();
        }, 400);
    }

    function saveCurrentFiles() {
        if (!state.files || state.files.length === 0) return;
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        if (activeFile) {
            activeFile.content = editorManager.getCode();
            // Also update legacy single-file storage for main file
            if (activeFile.isMain || activeFile.name === window.LANGUAGES[state.currentLanguage]?.filename) {
                localStorage.setItem(`compilerg_code_${state.currentLanguage}`, activeFile.content);
            }
        }
        try {
            localStorage.setItem(`compilerg_files_${state.currentLanguage}`, JSON.stringify(state.files));
        } catch (e) {
            // In case localStorage is full with very large projects
        }
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
                if (outputScreen) {
                    outputScreen.innerHTML = stdoutText
                        ? `<span class="stdout">${escapeHtml(stdoutText)}</span>`
                        : '<span style="color: #64748b;">(Process completed with exit code 0)</span>';
                }
                state.lastErrorOutput = '';
            } else {
                if (statusBadge) {
                    statusBadge.textContent = result.statusDescription || 'ERROR';
                    statusBadge.className = 'status-badge error';
                }

                let errCombined = (result.compileOutput ? result.compileOutput + '\n' : '') + (result.stderr || '');
                if (errCombined.length > 50000) {
                    errCombined = errCombined.slice(0, 50000) + '\n\n... [Error output truncated for performance]';
                }
                state.lastErrorOutput = errCombined || result.statusDescription || 'Runtime error occurred';

                let outputHtml = '';
                if (result.stdout) {
                    let st = result.stdout;
                    if (st.length > 50000) st = st.slice(0, 50000) + '\n... [Output truncated]';
                    outputHtml += `<span class="stdout">${escapeHtml(st)}</span>\n`;
                }
                outputHtml += `<div class="stderr">${escapeHtml(state.lastErrorOutput)}</div>`;
                if (outputScreen) outputScreen.innerHTML = outputHtml;

                // Trigger Tactile Error Animations & Banner
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
            }
        } catch (err) {
            if (statusBadge) {
                statusBadge.textContent = 'FAILED';
                statusBadge.className = 'status-badge error';
            }
            if (terminalPane) terminalPane.classList.add('has-error');
            if (outputScreen) outputScreen.innerHTML = `<div class="stderr">Execution error: ${escapeHtml(err.message)}</div>`;
        } finally {
            state.isExecuting = false;
            if (runBtn) {
                runBtn.classList.remove('loading');
                const label = runBtn.querySelector('span');
                if (label) label.textContent = 'Run';
            }
        }
    }

    if (runBtn) {
        runBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
            saveCurrentFiles();
            showToast('Code saved!', 'success');
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

    if (authForm) authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authEmail?.value || 'Developer';
        authModal.classList.remove('open');
        showToast(`Welcome, ${email}! Signed in successfully.`, 'success');
    });

    if (authDemoGoogle) authDemoGoogle.addEventListener('click', () => {
        authModal.classList.remove('open');
        showToast('Signed in with Google demo account!', 'success');
    });

    if (authDemoGithub) authDemoGithub.addEventListener('click', () => {
        authModal.classList.remove('open');
        showToast('Signed in with GitHub demo account!', 'success');
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
