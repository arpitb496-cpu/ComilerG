/**
 * CompilerG - Comprehensive Project Verification & Health Check Suite
 * Validates DOM integrity, language definitions, boilerplates, AI debugger regexes,
 * Monaco editor configuration, and server health.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
let errorCount = 0;
let passCount = 0;

function logPass(msg) {
    passCount++;
    console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
}

function logFail(msg, details = '') {
    errorCount++;
    console.error(`  \x1b[31m✖\x1b[0m ${msg}`);
    if (details) console.error(`    \x1b[33m${details}\x1b[0m`);
}

function assert(condition, successMsg, failMsg, details = '') {
    if (condition) {
        logPass(successMsg);
    } else {
        logFail(failMsg, details);
    }
}

console.log('\n======================================================');
console.log('   CompilerG Ralph Loop & Project Health Check');
console.log('======================================================\n');

// 1. Validate Project Structure
console.log('1. Checking Project File Structure:');
const requiredFiles = [
    'index.html',
    'server.py',
    'README.md',
    'css/style.css',
    'js/sound_fx.js',
    'js/gamification.js',
    'js/mascot.js',
    'js/languages.js',
    'js/boilerplates.js',
    'js/particles.js',
    'js/editor.js',
    'js/executor.js',
    'js/ai_debugger.js',
    'js/app.js'
];

for (const file of requiredFiles) {
    const filePath = path.join(ROOT_DIR, file);
    assert(fs.existsSync(filePath), `Found ${file}`, `Missing core file: ${file}`);
}

// 2. Validate HTML & Linked Assets
console.log('\n2. Validating index.html & Linked Assets:');
const htmlPath = path.join(ROOT_DIR, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptSrcRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
let match;
const foundScripts = [];
while ((match = scriptSrcRegex.exec(htmlContent)) !== null) {
    foundScripts.push(match[1]);
}

const localScripts = foundScripts.filter(s => !s.startsWith('http://') && !s.startsWith('https://'));
for (const s of localScripts) {
    const cleanSrc = s.split('?')[0];
    const scriptPath = path.join(ROOT_DIR, cleanSrc);
    assert(fs.existsSync(scriptPath), `Script tag "${s}" resolves to valid file`, `Script tag "${s}" not found on disk`);
}

// Check Monaco Loader script presence
assert(
    htmlContent.includes('vs/loader.min.js') || htmlContent.includes('vs/loader.js'),
    'Monaco Editor AMD Loader present in index.html',
    'Monaco Editor AMD loader script missing in index.html'
);

// 3. Validate DOM Elements vs app.js References
console.log('\n3. Validating DOM Elements referenced in app.js:');
const appJsPath = path.join(ROOT_DIR, 'js/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const referencedIds = new Set();
while ((match = idRegex.exec(appJsContent)) !== null) {
    referencedIds.add(match[1]);
}

for (const id of referencedIds) {
    const hasId = htmlContent.includes(`id="${id}"`) || htmlContent.includes(`id='${id}'`);
    assert(hasId, `DOM Element #${id} exists in index.html`, `DOM Element #${id} missing from index.html`);
}

// 4. Validate Languages & Boilerplates Sync
console.log('\n4. Validating Languages & Starter Boilerplates:');
global.window = global;
const memoryStore = {};
global.localStorage = {
    getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
    setItem: (k, v) => { memoryStore[k] = String(v); },
    removeItem: (k) => { delete memoryStore[k]; },
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); }
};
try {
    eval(fs.readFileSync(path.join(ROOT_DIR, 'js/languages.js'), 'utf8'));
    eval(fs.readFileSync(path.join(ROOT_DIR, 'js/boilerplates.js'), 'utf8'));

    const langKeys = Object.keys(window.LANGUAGES || {});
    const bpKeys = Object.keys(window.BOILERPLATES || {});

    assert(langKeys.length >= 15, `Loaded ${langKeys.length} languages from languages.js`, `Fewer than 15 languages found`);
    
    for (const key of langKeys) {
        const lang = window.LANGUAGES[key];
        assert(lang.id && lang.name && lang.monacoLang && lang.extension && lang.filename,
            `Language "${key}" has complete metadata (${lang.name})`,
            `Language "${key}" is missing required metadata properties`);
        
        assert(typeof window.BOILERPLATES[key] === 'string' && window.BOILERPLATES[key].length > 10,
            `Boilerplate for "${key}" is defined and non-empty`,
            `Boilerplate for "${key}" is missing or empty`);
    }

    const missingBp = langKeys.filter(k => !bpKeys.includes(k));
    assert(missingBp.length === 0, `All languages have matching boilerplates`, `Missing boilerplates for: ${missingBp.join(', ')}`);
} catch (e) {
    logFail('Evaluation of languages.js / boilerplates.js threw an error', e.message);
}

// 5. Validate EditorManager & Custom Themes
console.log('\n5. Validating EditorManager Theme Definitions:');
try {
    eval(fs.readFileSync(path.join(ROOT_DIR, 'js/editor.js'), 'utf8'));
    const editor = new window.EditorManager();
    const validThemes = [
        'compilerg-codedex',
        'compilerg-obsidian',
        'compilerg-tokyo-night',
        'compilerg-cyberpunk',
        'compilerg-dracula',
        'compilerg-one-dark',
        'compilerg-nord',
        'compilerg-monokai',
        'compilerg-solarized',
        'compilerg-dark',
        'compilerg-light'
    ];
    assert(validThemes.includes(editor.theme),
        `Default editor theme initialized cleanly to: ${editor.theme}`,
        `Editor theme invalid: ${editor.theme}`);

    const themeKeys = ['codedex', 'obsidian', 'tokyo-night', 'cyberpunk', 'dracula', 'one-dark', 'nord', 'monokai', 'solarized', 'dark', 'light'];
    for (const key of themeKeys) {
        const normalized = editor.normalizeTheme(key);
        assert(validThemes.includes(normalized),
            `Theme "${key}" normalizes to registered theme "${normalized}"`,
            `Normalization failed for "${key}" -> got "${normalized}"`);
    }
} catch (e) {
    logFail('Evaluation of editor.js threw an error', e.message);
}

// 6. Validate AI Debugger Heuristic Patterns
console.log('\n6. Validating AI Debugger Heuristic Rules:');
try {
    eval(fs.readFileSync(path.join(ROOT_DIR, 'js/ai_debugger.js'), 'utf8'));
    const debuggerInstance = new window.AIDebugger();

    // Test Python Syntax Error detection
    const pyErrorSample = 'File "main.py", line 4\n    print("Hello"\n                ^\nSyntaxError: \'(\' was never closed';
    const pyCodeSample = 'import math\n\ndef test():\n    print("Hello"\n';
    const pyDiag = debuggerInstance.smartAnalyze({
        language: 'python',
        code: pyCodeSample,
        errorOutput: pyErrorSample
    });

    assert(pyDiag.line === 4, `Python error line detected correctly (line 4)`, `Python error line mismatch: got ${pyDiag.line}`);
    assert(pyDiag.errorType.toLowerCase().includes('syntax'), `Python errorType detected as SyntaxError`, `Python errorType mismatch: ${pyDiag.errorType}`);
    assert(typeof pyDiag.fixedCode === 'string', `Python fix suggested`, `No fix code returned for Python`);

    // Test Python EOFError & STDIN diagnosis + auto-fix
    const pyEofErr = 'Traceback (most recent call last):\n  File "main.py", line 16, in <module>\n    solve()\n  File "main.py", line 8, in solve\n    name = input("Enter: ")\nEOFError: EOF when reading a line';
    const pyEofCode = 'def solve():\n    name = input("Enter: ")\n    print(name)\n\nsolve()';
    const pyEofDiag = debuggerInstance.smartAnalyze({
        language: 'python',
        code: pyEofCode,
        errorOutput: pyEofErr
    });
    assert(pyEofDiag.line === 8 || pyEofDiag.line === 2, `Python EOFError correctly mapped to input line (${pyEofDiag.line})`, `Python EOFError line mapping failed: got ${pyEofDiag.line}`);
    assert(pyEofDiag.errorType.includes('EOFError'), `Python EOFError detected properly`, `Mismatch on EOFError type`);
    assert(pyEofDiag.fixedCode !== pyEofCode, `Python EOFError auto-fix generated fallback code`, `No auto-fix generated for EOFError`);

    // Test C++ Missing Semicolon detection
    const cppErrorSample = "main.cpp:5:25: error: expected ';' before 'return'\n    5 |     int x = 100\n      |                ^\n      |                ;";
    const cppCodeSample = '#include <iostream>\nint main() {\n    int x = 100\n    return 0;\n}';
    const cppDiag = debuggerInstance.smartAnalyze({
        language: 'cpp',
        code: cppCodeSample,
        errorOutput: cppErrorSample
    });

    assert(cppDiag.line === 5 || cppDiag.line === 3, `C++ error line identified (line ${cppDiag.line})`, `C++ error line identification failed`);
    assert(cppDiag.solution.length > 10, `C++ diagnostic solution provided`, `No solution generated for C++ error`);
} catch (e) {
    logFail('Evaluation of ai_debugger.js threw an error', e.message);
}

// 7. Validate Codédex Gamification, Sound Synthesizer & Mascot
console.log('\n7. Validating Codédex Gamification Engine & Audio Synthesizer:');
try {
    // Audio Synthesizer
    const SoundFX = require(path.join(ROOT_DIR, 'js/sound_fx.js'));
    const soundInstance = new SoundFX();
    assert(typeof soundInstance.playClick === 'function', 'SoundFX.playClick() is implemented', 'Missing playClick');
    assert(typeof soundInstance.playSuccess === 'function', 'SoundFX.playSuccess() is implemented', 'Missing playSuccess');
    assert(typeof soundInstance.playXpGain === 'function', 'SoundFX.playXpGain() is implemented', 'Missing playXpGain');
    assert(typeof soundInstance.playLevelUp === 'function', 'SoundFX.playLevelUp() is implemented', 'Missing playLevelUp');
    assert(typeof soundInstance.playError === 'function', 'SoundFX.playError() is implemented', 'Missing playError');
    assert(typeof soundInstance.playQuestComplete === 'function', 'SoundFX.playQuestComplete() is implemented', 'Missing playQuestComplete');
    assert(typeof soundInstance.toggleMute === 'function', 'SoundFX.toggleMute() is implemented', 'Missing toggleMute');

    // Gamification Engine
    const GamificationEngine = require(path.join(ROOT_DIR, 'js/gamification.js'));
    const game = new GamificationEngine();
    assert(Array.isArray(game.quests) && game.quests.length >= 5, `GamificationEngine contains ${game.quests.length} coding quests (>= 5)`, 'Quests array missing or too short');
    assert(Array.isArray(game.levelTiers) && game.levelTiers.length >= 5, `GamificationEngine contains ${game.levelTiers.length} level tiers`, 'Level tiers missing or too short');

    // Test Quest 1 Validation
    const q1 = game.getQuest('quest-1');
    assert(q1 && q1.validate('Hello, Adventurer!'), 'Quest 1 validates correct output "Hello, Adventurer!"', 'Quest 1 validation failed');
    assert(!q1.validate('Goodbye World'), 'Quest 1 correctly rejects invalid output', 'Quest 1 falsely accepted invalid output');

    // Test Level & XP Progression
    const initialLvl = game.getLevelInfo();
    assert(initialLvl.level >= 1 && initialLvl.title, `Initial player level initialized to: Level ${initialLvl.level} (${initialLvl.title})`, 'Level info invalid');
    const xpResult = game.addXp(100);
    assert(xpResult.totalXp >= 100, `XP incremented correctly: ${xpResult.totalXp} XP`, 'XP increment failed');

    // Mascot
    const MascotDex = require(path.join(ROOT_DIR, 'js/mascot.js'));
    assert(typeof MascotDex === 'function', 'MascotDex class imported successfully', 'MascotDex class missing');
} catch (e) {
    logFail('Gamification / Sound engine evaluation threw an error', e.message);
}

// 8. Validate Local Development Server & Turbo Runner
console.log('\n8. Validating Local Development Server & Turbo Runner:');
const checkServer = () => new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000', (res) => {
        assert(res.statusCode === 200, `Local server responds with HTTP 200 OK`, `Server returned status ${res.statusCode}`);
        assert(res.headers['access-control-allow-origin'] === '*', `Server includes CORS header`, `Server missing CORS header`);

        // Test /api/run turbo runner
        const postData = JSON.stringify({ language: 'python', code: 'print(42)', stdin: '' });
        const postReq = http.request('http://127.0.0.1:3000/api/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (apiRes) => {
            let body = '';
            apiRes.on('data', chunk => { body += chunk; });
            apiRes.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    assert(data.supported && data.isSuccess && data.stdout.trim() === '42',
                        `Local Turbo Runner (/api/run) executed code in ${data.time} (Engine: ${data.engine})`,
                        `Turbo runner check failed: ${body}`);
                } catch (err) {
                    logFail('Failed parsing /api/run JSON response', err.message);
                }
                resolve();
            });
        });

        postReq.on('error', (err) => {
            logFail('Error connecting to /api/run', err.message);
            resolve();
        });
        postReq.write(postData);
        postReq.end();
    });
    req.on('error', (err) => {
        logFail('Server unreachable on http://127.0.0.1:3000', err.message);
        resolve();
    });
    req.setTimeout(3000, () => {
        req.abort();
        logFail('Server check timed out on http://127.0.0.1:3000');
        resolve();
    });
});

checkServer().then(() => {
    console.log('\n======================================================');
    console.log(`Results: \x1b[32m${passCount} Passed\x1b[0m, \x1b[${errorCount === 0 ? '32m0' : '31m' + errorCount}\x1b[0m Failed`);
    console.log('======================================================\n');
    if (errorCount > 0) {
        process.exit(1);
    } else {
        console.log('🎉 ALL PROJECT CHECKS PASSED WITH ZERO ERRORS!\n');
        process.exit(0);
    }
});
