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
        localStorage.setItem(`compilerg_files_${state.currentLanguage}`, JSON.stringify(state.files));
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
                const stdoutText = result.stdout || '';
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

                const errCombined = (result.compileOutput ? result.compileOutput + '\n' : '') + (result.stderr || '');
                state.lastErrorOutput = errCombined || result.statusDescription || 'Runtime error occurred';

                let outputHtml = '';
                if (result.stdout) {
                    outputHtml += `<span class="stdout">${escapeHtml(result.stdout)}</span>\n`;
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

    // Trigger pulse suggest on editor change
    editorManager.onDidChangeContent(() => {
        if (runBtn && !state.isExecuting) {
            runBtn.classList.add('pulse-suggest');
        }
        saveCurrentFiles();
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
    });

    // --- Initialize Editor & Multi-File System ---
    const initialLangConfig = window.LANGUAGES[state.currentLanguage] || window.LANGUAGES.python;
    updateFileLabel(initialLangConfig);
    syncLanguageUI(state.currentLanguage);

    const initialFile = loadFilesForLanguage(state.currentLanguage);
    const initialMonacoLang = getMonacoLangFromFilename(initialFile.name);

    // Synchronously mounts fallback editor & launches Monaco in background
    editorManager.initSync(monacoContainer, initialMonacoLang, initialFile.content);

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
