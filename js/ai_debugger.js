/**
 * CompilerG - AI Code Debugger & Assistant
 * Analyzes compiler/runtime errors, pinpoints problematic lines,
 * explains what went wrong, and generates one-click code fixes.
 */

class AIDebugger {
    constructor() {
        this.apiKey = localStorage.getItem('compilerg_gemini_key') || '';
        this.lastAnalysis = null;
    }

    setApiKey(key) {
        this.apiKey = key.trim();
        if (this.apiKey) {
            localStorage.setItem('compilerg_gemini_key', this.apiKey);
        } else {
            localStorage.removeItem('compilerg_gemini_key');
        }
    }

    getApiKey() {
        return this.apiKey;
    }

    /**
     * Main debug entry point
     * @param {Object} params { language, code, errorOutput, stdin }
     * @returns {Promise<Object>} { line, errorType, explanation, solution, fixedCode, source }
     */
    async debugError({ language, code, errorOutput, stdin = '' }) {
        if (!errorOutput || errorOutput.trim() === '') {
            return {
                line: null,
                errorType: 'No Error Detected',
                explanation: 'Execution completed without any standard error output.',
                solution: 'Your code executed normally. If output is unexpected, review your logical flow.',
                fixedCode: code,
                source: 'analyzer'
            };
        }

        // If Gemini API Key is available, prioritize cloud AI
        if (this.apiKey) {
            try {
                const geminiResult = await this.callGeminiAI({ language, code, errorOutput, stdin });
                if (geminiResult && geminiResult.fixedCode) {
                    this.lastAnalysis = geminiResult;
                    return geminiResult;
                }
            } catch (err) {
                console.warn('Gemini API call failed, falling back to smart heuristic analyzer:', err);
            }
        }

        // Instant Built-in Smart Heuristic Analyzer
        const heuristicResult = this.smartAnalyze({ language, code, errorOutput });
        this.lastAnalysis = heuristicResult;
        return heuristicResult;
    }

    /**
     * Calls Google Gemini API for comprehensive code analysis & fixing
     */
    async callGeminiAI({ language, code, errorOutput, stdin }) {
        const prompt = `You are the AI Code Debugger for the online compiler "CompilerG".
Analyze this code execution error and return a strict JSON response.

Language: ${language}
STDIN: ${stdin}
Source Code:
\`\`\`${language}
${code}
\`\`\`

Execution Error / Stderr:
\`\`\`
${errorOutput}
\`\`\`

Return a valid JSON object matching this schema exactly without markdown wrapping:
{
  "line": <integer line number where error occurred or null>,
  "errorType": "<Short error name like SyntaxError, NullPointerException, Missing Semicolon, etc.>",
  "explanation": "<Clear, beginner-friendly explanation of why this error happened>",
  "solution": "<Step-by-step guidance on how to fix it>",
  "fixedCode": "<The complete corrected source code ready to replace in the editor>"
}`;

        const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastError = null;

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.2,
                            responseMimeType: "application/json"
                        }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData?.error?.message || `HTTP ${response.status}`);
                }

                const data = await response.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!rawText) throw new Error("Empty response from Gemini AI");

                // Clean JSON if needed
                let cleanJson = rawText.trim();
                if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');

                const parsed = JSON.parse(cleanJson);
                return {
                    ...parsed,
                    source: 'gemini'
                };
            } catch (err) {
                lastError = err;
                console.warn(`Model ${model} failed:`, err);
            }
        }

        throw lastError;
    }

    /**
     * Built-in Heuristic Error Analyzer
     * Analyzes standard compiler error outputs, detects line numbers and common pitfalls,
     * and constructs automatic fixes.
     */
    smartAnalyze({ language, code, errorOutput }) {
        const lines = code.split('\n');
        let errorLine = null;
        let errorType = 'Execution Error';
        let explanation = 'An error occurred during code compilation or runtime execution.';
        let solution = 'Review the stack trace below and adjust your code logic.';
        let fixedCode = code;

        const cleanErr = errorOutput.trim();

        // Helper: Find innermost line number from Python/GCC/Java stack traces
        const extractInnermostLine = (text) => {
            const matches = [...text.matchAll(/(?:line|ln|main\.\w+:)\s*(\d+)/gi)];
            if (matches.length > 0) {
                return parseInt(matches[matches.length - 1][1], 10);
            }
            return null;
        };

        // 1. PYTHON
        if (language === 'python') {
            errorLine = extractInnermostLine(cleanErr);

            if (cleanErr.includes('EOFError')) {
                // If innermost line wasn't the input line, find the line containing input()
                if (!errorLine || errorLine > lines.length || !lines[errorLine - 1].includes('input(')) {
                    const foundIdx = lines.findIndex(l => l.includes('input('));
                    if (foundIdx !== -1) {
                        errorLine = foundIdx + 1;
                    }
                }
                errorType = 'EOFError: EOF when reading a line';
                explanation = `Line ${errorLine || ''}: Program called input() to read from standard input, but the STDIN panel was empty.`;
                solution = 'Switch to the "STDIN" tab to provide input before running, or use a safe fallback in your code.';

                // Auto-fix: replace input() with safe input reading
                if (errorLine && errorLine <= lines.length) {
                    const badLine = lines[errorLine - 1];
                    const indent = badLine.match(/^\s*/)[0];
                    if (badLine.includes('input(')) {
                        const varMatch = badLine.match(/(\w+)\s*=/);
                        const varName = varMatch ? varMatch[1] : 'user_input';
                        lines[errorLine - 1] = `${indent}# Safe input with fallback when STDIN is empty\n${indent}try:\n${indent}    ${badLine.trim()}\n${indent}except EOFError:\n${indent}    ${varName} = "Developer"`;
                        fixedCode = lines.join('\n');
                    }
                }
            } else if (cleanErr.includes('unexpected EOF while parsing') || cleanErr.includes('was never closed') || cleanErr.includes('unmatched') || cleanErr.includes('closing parenthesis')) {
                errorType = 'SyntaxError: Unclosed Parenthesis or Bracket';
                explanation = `Line ${errorLine || 'end'}: A closing parenthesis ')', bracket ']', or quote was never closed.`;
                solution = 'Verify that all opened brackets, parentheses, and quotes have matching closing pairs.';
                
                if (errorLine && errorLine <= lines.length) {
                    const badLine = lines[errorLine - 1];
                    const openP = (badLine.match(/\(/g) || []).length;
                    const closeP = (badLine.match(/\)/g) || []).length;
                    if (openP > closeP) {
                        lines[errorLine - 1] = badLine + ')'.repeat(openP - closeP);
                        fixedCode = lines.join('\n');
                    }
                }
            } else if (cleanErr.includes("expected ':'") || cleanErr.includes('invalid syntax')) {
                errorType = 'SyntaxError: Missing Colon (:) or Invalid Syntax';
                explanation = `Line ${errorLine || ''}: Statement is missing a trailing colon ':' or has invalid syntax.`;
                solution = 'Ensure that control statements (if, for, while, def, class, elif, else) end with a colon (:).';
                if (errorLine && errorLine <= lines.length) {
                    const badLine = lines[errorLine - 1];
                    if (!badLine.trim().endsWith(':') && /(if|for|while|def|class|elif|else)\b/.test(badLine)) {
                        lines[errorLine - 1] = badLine.trimEnd() + ':';
                        fixedCode = lines.join('\n');
                    }
                }
            } else if (cleanErr.includes('IndentationError')) {
                errorType = 'IndentationError: Inconsistent Indentation';
                explanation = `Line ${errorLine || ''}: Python requires consistent 4-space indentation for code blocks.`;
                solution = 'Ensure your code uses consistent 4 spaces inside functions, conditions, and loops.';
                if (errorLine && errorLine <= lines.length && errorLine > 1) {
                    const prevIndent = lines[errorLine - 2].match(/^\s*/)[0];
                    lines[errorLine - 1] = prevIndent + '    ' + lines[errorLine - 1].trim();
                    fixedCode = lines.join('\n');
                }
            } else if (cleanErr.includes('ZeroDivisionError')) {
                errorType = 'ZeroDivisionError: Division by Zero';
                explanation = `Line ${errorLine || ''}: Attempted to divide a number by zero (0).`;
                solution = 'Add a validation check to verify the divisor is not zero before performing division.';
                if (errorLine && errorLine <= lines.length) {
                    const badLine = lines[errorLine - 1];
                    const indent = badLine.match(/^\s*/)[0];
                    lines[errorLine - 1] = `${indent}# Guarded against division by zero\n${indent}try:\n${indent}    ${badLine.trim()}\n${indent}except ZeroDivisionError:\n${indent}    print("Error: Cannot divide by zero")`;
                    fixedCode = lines.join('\n');
                }
            } else if (cleanErr.includes('NameError')) {
                const varMatch = cleanErr.match(/name '(\w+)' is not defined/);
                const varName = varMatch ? varMatch[1] : 'variable';
                errorType = `NameError: '${varName}' is not defined`;
                explanation = `Line ${errorLine || ''}: Variable or function '${varName}' is referenced before declaration.`;
                solution = `Initialize '${varName}' with a default value or import the appropriate module before using it.`;
                if (errorLine && errorLine <= lines.length) {
                    const indent = lines[errorLine - 1].match(/^\s*/)[0];
                    lines.splice(errorLine - 1, 0, `${indent}${varName} = None  # Auto-initialized by AI`);
                    fixedCode = lines.join('\n');
                }
            } else if (cleanErr.includes('IndexError')) {
                errorType = 'IndexError: List index out of range';
                explanation = `Line ${errorLine || ''}: Attempted to access an index that exceeds the size of the list.`;
                solution = 'Check the length of the list using len() before accessing elements by index.';
            } else if (cleanErr.includes('TypeError')) {
                errorType = 'TypeError: Incompatible Types';
                explanation = `Line ${errorLine || ''}: An operation was attempted on incompatible data types (e.g. adding integer to string).`;
                solution = 'Convert types explicitly using str(), int(), or float() before combining them.';
            } else if (cleanErr.includes('KeyError')) {
                errorType = 'KeyError: Dictionary key not found';
                explanation = `Line ${errorLine || ''}: Accessed a dictionary key that does not exist.`;
                solution = 'Use dict.get(key, default) to safely look up dictionary keys without crashing.';
            }
        }

        // 2. C / C++
        else if (language === 'c' || language === 'cpp') {
            const lineMatch = cleanErr.match(/:(\d+):\d+:\s*(?:error|fatal error):/i) || cleanErr.match(/:(\d+):\s*error:/i);
            if (lineMatch) errorLine = parseInt(lineMatch[1], 10);

            if (cleanErr.includes("expected ';'") || cleanErr.includes("error: expected ';'")) {
                errorType = 'Compilation Error: Missing Semicolon (;)';
                explanation = `Line ${errorLine || ''}: A statement is missing a closing semicolon (;).`;
                solution = 'Insert a semicolon ";" at the end of the statement.';
                if (errorLine && errorLine <= lines.length) {
                    const targetIdx = errorLine - 1;
                    if (!lines[targetIdx].trim().endsWith(';')) {
                        lines[targetIdx] = lines[targetIdx].trimEnd() + ';';
                        fixedCode = lines.join('\n');
                    } else if (targetIdx > 0 && !lines[targetIdx - 1].trim().endsWith(';')) {
                        lines[targetIdx - 1] = lines[targetIdx - 1].trimEnd() + ';';
                        fixedCode = lines.join('\n');
                    }
                }
            } else if (cleanErr.includes('was not declared in this scope')) {
                const varMatch = cleanErr.match(/'(\w+)' was not declared in this scope/);
                const varName = varMatch ? varMatch[1] : 'variable';
                errorType = `Undeclared Identifier: '${varName}'`;
                explanation = `Identifier '${varName}' is used without being declared or its header file is missing.`;
                solution = `Declare '${varName}' with a type (e.g., int ${varName} = 0;) or #include the appropriate header.`;
            } else if (cleanErr.includes('Segmentation fault')) {
                errorType = 'Runtime Error: Segmentation Fault (SIGSEGV)';
                explanation = 'Program attempted to read or write to unallocated memory (e.g. null pointer or array out of bounds).';
                solution = 'Inspect pointers, check array boundary indices, and verify memory allocations.';
            } else if (cleanErr.includes('undefined reference to `main`') || cleanErr.includes('undefined reference to main')) {
                errorType = 'Linker Error: Missing main() Function';
                explanation = 'The linker cannot find the entry point "int main()".';
                solution = 'Add "int main() { ... return 0; }" to your source file.';
                fixedCode = code + '\n\nint main() {\n    return 0;\n}';
            }
        }

        // 3. JAVA
        else if (language === 'java') {
            const lineMatch = cleanErr.match(/:(\d+):\s*error:/i) || cleanErr.match(/Main\.java:(\d+)/i);
            if (lineMatch) errorLine = parseInt(lineMatch[1], 10);

            if (cleanErr.includes("class Main is public, should be declared in a file named Main.java") || cleanErr.includes("should be declared in a file named")) {
                errorType = 'Java Class Name Mismatch';
                explanation = 'Online execution environments require the main public class to be named "Main".';
                solution = 'Rename your public class to "Main" (public class Main { ... }).';
                fixedCode = code.replace(/public\s+class\s+\w+/i, 'public class Main');
            } else if (cleanErr.includes("';' expected")) {
                errorType = 'SyntaxError: Semicolon Expected (;)';
                explanation = `Line ${errorLine || ''}: Missing semicolon at the end of the statement.`;
                solution = 'Add a semicolon ";" at the end of the line.';
                if (errorLine && errorLine <= lines.length) {
                    lines[errorLine - 1] = lines[errorLine - 1].trimEnd() + ';';
                    fixedCode = lines.join('\n');
                }
            } else if (cleanErr.includes('cannot find symbol')) {
                errorType = 'Compilation Error: Cannot Find Symbol';
                explanation = `Line ${errorLine || ''}: The compiler cannot locate the specified identifier or method.`;
                solution = 'Verify the variable name, spelling, and ensure necessary packages (e.g. java.util.*) are imported.';
            } else if (cleanErr.includes('NullPointerException')) {
                errorType = 'Runtime Exception: NullPointerException';
                explanation = 'Attempted to invoke a method or access a field on a null object reference.';
                solution = 'Ensure the object is instantiated before invoking methods on it.';
            }
        }

        // 4. JAVASCRIPT / TYPESCRIPT
        else if (language === 'javascript' || language === 'typescript') {
            const lineMatch = cleanErr.match(/:(\d+):\d+/);
            if (lineMatch) errorLine = parseInt(lineMatch[1], 10);

            if (cleanErr.includes('ReferenceError')) {
                const varMatch = cleanErr.match(/(\w+) is not defined/);
                const varName = varMatch ? varMatch[1] : 'variable';
                errorType = `ReferenceError: ${varName} is not defined`;
                explanation = `Line ${errorLine || ''}: Variable '${varName}' is accessed without being declared.`;
                solution = `Declare '${varName}' with let, const, or var before referencing it.`;
                if (errorLine && errorLine <= lines.length) {
                    const indent = lines[errorLine - 1].match(/^\s*/)[0];
                    lines.splice(errorLine - 1, 0, `${indent}let ${varName} = null; // Auto-declared by AI`);
                    fixedCode = lines.join('\n');
                }
            } else if (cleanErr.includes('TypeError: Cannot read properties of undefined') || cleanErr.includes('Cannot read property')) {
                errorType = 'TypeError: Cannot Read Properties of Undefined';
                explanation = `Line ${errorLine || ''}: Attempted to access a property on an undefined or null variable.`;
                solution = 'Use optional chaining (?.) or verify that the object exists before accessing its properties.';
            } else if (cleanErr.includes('SyntaxError')) {
                errorType = 'SyntaxError: Unexpected Token or Malformed Syntax';
                explanation = `Line ${errorLine || ''}: Encountered invalid syntax or an unexpected character.`;
                solution = 'Review parentheses, braces, commas, and string quotes around the indicated line.';
            }
        }

        // Generic fallback for unhandled exceptions
        if (!errorLine) {
            errorLine = extractInnermostLine(cleanErr);
        }

        // If no code fix was generated, provide safe error-handling wrap
        if (fixedCode === code && errorLine && errorLine <= lines.length) {
            if (language === 'python') {
                const indent = lines[errorLine - 1].match(/^\s*/)[0];
                const originalLine = lines[errorLine - 1].trim();
                lines[errorLine - 1] = `${indent}try:\n${indent}    ${originalLine}\n${indent}except Exception as e:\n${indent}    print(f"Handled error on line ${errorLine}: {e}")`;
                fixedCode = lines.join('\n');
            }
        }

        return {
            line: errorLine,
            errorType,
            explanation,
            solution,
            fixedCode: fixedCode !== code ? fixedCode : code,
            rawError: cleanErr,
            source: 'heuristic'
        };
    }

    /**
     * Explains the user's current code line-by-line or concepts
     */
    async explainCode({ language, code }) {
        if (!code || code.trim() === '') {
            return {
                title: 'Empty Editor',
                explanation: 'Write or paste some code into the editor, then click "Explain Code" to get an AI breakdown.'
            };
        }

        if (!this.apiKey) {
            // Intelligent offline code breakdown
            const lines = code.split('\n');
            const funcs = [...code.matchAll(/(?:def|function)\s+(\w+)/g)].map(m => m[1]);
            const loops = [...code.matchAll(/\b(for|while)\b/g)].length;
            const complexity = loops === 0 ? 'O(1) Constant Time' : loops === 1 ? 'O(N) Linear Time' : 'O(N²) Polynomial Time';

            return {
                title: '⚡ Code Analysis & Complexity Overview',
                explanation: `• Language: ${language.toUpperCase()} (${lines.length} lines)\n• Detected Functions: ${funcs.length > 0 ? funcs.join(', ') : 'Main script routine'}\n• Estimated Complexity: ${complexity}\n• Structure: Clean structured code with ${loops} loop construct(s).\n\nTip: Connect your free Google Gemini API key in Settings (⚙️) for conversational multi-turn AI reasoning and deep line-by-line code reviews!`
            };
        }

        const prompt = `Explain this ${language} code clearly for a developer:
\`\`\`${language}
${code}
\`\`\`
Provide:
1. High-level Summary (What does this code do?)
2. Step-by-step logic breakdown
3. Estimated Time & Space Complexity`;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate code explanation.";
            return { title: 'AI Code Explanation', explanation: text };
        } catch (err) {
            return { title: 'AI Code Explanation', explanation: `Analysis error: ${err.message}` };
        }
    }
}

window.AIDebugger = AIDebugger;
