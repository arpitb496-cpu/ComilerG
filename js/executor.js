/**
 * CompilerG - Code Executor
 * Interacts with Judge0 CE public API & handles client-side HTML/CSS/JS sandbox runner.
 */

class CodeExecutor {
    constructor() {
        this.apiEndpoint = 'https://ce.judge0.com';
    }

    /**
     * Executes code using Judge0 CE or Client-side Sandbox
     * @param {Object} params { languageKey, code, stdin }
     */
    async execute({ languageKey, code, stdin = '', files = [] }) {
        const langConfig = window.LANGUAGES[languageKey];
        if (!langConfig) {
            throw new Error(`Language '${languageKey}' not supported.`);
        }

        // Special handling for HTML/CSS/JS live web preview
        if (langConfig.id === 'html') {
            return this.executeWeb({ code, files });
        }

        // Try high-speed Local / OneCompiler Turbo Engine first
        try {
            const localResult = await this.executeLocalTurbo({ languageKey, code, stdin, files });
            if (localResult && localResult.supported) {
                return localResult;
            }
        } catch (e) {
            // Smoothly fall through to Judge0
        }

        const judge0Id = langConfig.judge0Id;
        if (!judge0Id) {
            throw new Error(`No compiler configured for ${langConfig.name}`);
        }

        return this.executeJudge0({ judge0Id, code, stdin, langConfig });
    }

    /**
     * Executes code via Turbo Runner (/api/run) in milliseconds
     */
    async executeLocalTurbo({ languageKey, code, stdin, files = [] }) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const res = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: languageKey, code, stdin, files }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) return { supported: false };
            const data = await res.json();
            return data;
        } catch (err) {
            clearTimeout(timeoutId);
            return { supported: false };
        }
    }

    /**
     * Remote execution via Judge0 CE API
     */
    async executeJudge0({ judge0Id, code, stdin, langConfig }) {
        const payload = {
            language_id: judge0Id,
            source_code: code,
            stdin: stdin || ''
        };

        const startTime = performance.now();

        try {
            const url = `${this.apiEndpoint}/submissions?base64_encoded=false&wait=true`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Execution service error (${response.status}): ${errText}`);
            }

            let result = await response.json();

            // If still queued or processing, poll with fast adaptive intervals
            if (result.status && (result.status.id === 1 || result.status.id === 2)) {
                result = await this.pollSubmission(result.token);
            }

            const elapsedMs = Math.round(performance.now() - startTime);

            return this.formatResult(result, elapsedMs);
        } catch (error) {
            return {
                isError: true,
                statusDescription: 'Service Error',
                statusCode: -1,
                stdout: null,
                stderr: error.message || 'Unknown network error communicating with execution engine.',
                compileOutput: null,
                time: '0.00',
                memory: '0 KB',
                elapsedMs: Math.round(performance.now() - startTime)
            };
        }
    }

    /**
     * Polls Judge0 with fast adaptive backoff intervals
     */
    async pollSubmission(token) {
        const intervals = [100, 200, 350, 500, 750, 1000, 1200, 1500];
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < intervals.length; i++) {
            await delay(intervals[i]);
            const res = await fetch(`${this.apiEndpoint}/submissions/${token}?base64_encoded=false`);
            if (res.ok) {
                const data = await res.json();
                if (data.status && data.status.id > 2) {
                    return data;
                }
            }
        }
        throw new Error('Execution timed out while waiting in cloud queue.');
    }

    /**
     * Formats Judge0 response into clean standardized result
     */
    formatResult(result, clientElapsedMs) {
        const statusId = result.status?.id || 0;
        const statusDesc = result.status?.description || 'Unknown';

        // Status IDs: 3 = Accepted (Success)
        // 4 = Wrong Answer, 5 = Time Limit Exceeded, 6 = Compilation Error
        // 7 to 12 = Runtime Errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, etc.)
        const isSuccess = statusId === 3;
        const isError = !isSuccess;

        let memoryStr = '0 KB';
        if (result.memory) {
            memoryStr = result.memory >= 1024 
                ? (result.memory / 1024).toFixed(1) + ' MB' 
                : result.memory + ' KB';
        }

        const timeStr = result.time ? `${result.time}s` : `${(clientElapsedMs / 1000).toFixed(2)}s`;

        return {
            isSuccess,
            isError,
            statusCode: statusId,
            statusDescription: statusDesc,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            compileOutput: result.compile_output || '',
            time: timeStr,
            memory: memoryStr,
            elapsedMs: clientElapsedMs,
            token: result.token
        };
    }

    /**
     * Client-side HTML/CSS/JS sandbox runner
     */
    executeWeb({ code, files = [] }) {
        const startTime = performance.now();
        let finalHtml = code;

        // Automatically inject linked CSS & JS files if present
        if (files && files.length > 0) {
            let injectedCss = '';
            let injectedJs = '';
            files.forEach(f => {
                if (f.name.endsWith('.css')) {
                    injectedCss += `<style>\n/* --- ${f.name} --- */\n${f.content}\n</style>\n`;
                } else if (f.name.endsWith('.js')) {
                    injectedJs += `<script>\n/* --- ${f.name} --- */\n${f.content}\n</script>\n`;
                }
            });

            if (injectedCss) {
                finalHtml = finalHtml.includes('</head>')
                    ? finalHtml.replace('</head>', `${injectedCss}</head>`)
                    : `${injectedCss}${finalHtml}`;
            }
            if (injectedJs) {
                finalHtml = finalHtml.includes('</body>')
                    ? finalHtml.replace('</body>', `${injectedJs}</body>`)
                    : `${finalHtml}${injectedJs}`;
            }
        }

        return {
            isSuccess: true,
            isError: false,
            isWebMode: true,
            statusDescription: 'Live Rendered',
            statusCode: 3,
            htmlContent: finalHtml,
            stdout: 'HTML/CSS/JS rendered successfully in Live Web Sandbox.',
            stderr: '',
            compileOutput: '',
            time: '0.01s',
            memory: 'Client Sandbox',
            elapsedMs: Math.round(performance.now() - startTime)
        };
    }
}

window.CodeExecutor = CodeExecutor;
