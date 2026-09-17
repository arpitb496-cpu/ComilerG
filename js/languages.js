/**
 * CompilerG - Language Definitions & Metadata
 * Maps languages to Monaco Editor modes and Judge0 CE compiler IDs.
 */

const LANGUAGES = {
    python: {
        id: 'python',
        name: 'Python 3',
        judge0Id: 100, // Python (3.12.5) on Judge0 CE
        monacoLang: 'python',
        extension: '.py',
        filename: 'main.py',
        icon: '🐍',
        category: 'popular'
    },
    cpp: {
        id: 'cpp',
        name: 'C++ (GCC 14.1)',
        judge0Id: 105, // C++ (GCC 14.1.0)
        monacoLang: 'cpp',
        extension: '.cpp',
        filename: 'main.cpp',
        icon: '⚡',
        category: 'popular'
    },
    c: {
        id: 'c',
        name: 'C (GCC 14.1)',
        judge0Id: 103, // C (GCC 14.1.0)
        monacoLang: 'c',
        extension: '.c',
        filename: 'main.c',
        icon: '🔧',
        category: 'popular'
    },
    java: {
        id: 'java',
        name: 'Java (JDK 17)',
        judge0Id: 91, // Java (JDK 17.0.6)
        monacoLang: 'java',
        extension: '.java',
        filename: 'Main.java',
        icon: '☕',
        category: 'popular'
    },
    javascript: {
        id: 'javascript',
        name: 'JavaScript (Node.js 22)',
        judge0Id: 102, // JavaScript (Node.js 22.08.0)
        monacoLang: 'javascript',
        extension: '.js',
        filename: 'index.js',
        icon: '🟨',
        category: 'popular'
    },
    typescript: {
        id: 'typescript',
        name: 'TypeScript (5.6)',
        judge0Id: 101, // TypeScript (5.6.2)
        monacoLang: 'typescript',
        extension: '.ts',
        filename: 'index.ts',
        icon: '🔷',
        category: 'popular'
    },
    html: {
        id: 'html',
        name: 'HTML / CSS / JS (Live Web)',
        judge0Id: null, // Client-side sandboxed iframe preview
        monacoLang: 'html',
        extension: '.html',
        filename: 'index.html',
        icon: '🌐',
        category: 'web'
    },
    go: {
        id: 'go',
        name: 'Go (1.23)',
        judge0Id: 107, // Go (1.23.5)
        monacoLang: 'go',
        extension: '.go',
        filename: 'main.go',
        icon: '🐹',
        category: 'system'
    },
    rust: {
        id: 'rust',
        name: 'Rust (1.85)',
        judge0Id: 108, // Rust (1.85.0)
        monacoLang: 'rust',
        extension: '.rs',
        filename: 'main.rs',
        icon: '🦀',
        category: 'system'
    },
    csharp: {
        id: 'csharp',
        name: 'C# (Mono 6.6)',
        judge0Id: 51, // C# (Mono 6.6.0.161)
        monacoLang: 'csharp',
        extension: '.cs',
        filename: 'Program.cs',
        icon: '🟣',
        category: 'backend'
    },
    php: {
        id: 'php',
        name: 'PHP (8.3)',
        judge0Id: 98, // PHP (8.3.11)
        monacoLang: 'php',
        extension: '.php',
        filename: 'index.php',
        icon: '🐘',
        category: 'backend'
    },
    ruby: {
        id: 'ruby',
        name: 'Ruby (2.7)',
        judge0Id: 72, // Ruby (2.7.0)
        monacoLang: 'ruby',
        extension: '.rb',
        filename: 'main.rb',
        icon: '💎',
        category: 'backend'
    },
    bash: {
        id: 'bash',
        name: 'Bash Shell',
        judge0Id: 46, // Bash (5.0.0)
        monacoLang: 'shell',
        extension: '.sh',
        filename: 'script.sh',
        icon: '🐚',
        category: 'scripting'
    },
    kotlin: {
        id: 'kotlin',
        name: 'Kotlin (2.1)',
        judge0Id: 111, // Kotlin (2.1.10)
        monacoLang: 'kotlin',
        extension: '.kt',
        filename: 'Main.kt',
        icon: '🎯',
        category: 'jvm'
    },
    swift: {
        id: 'swift',
        name: 'Swift (5.2)',
        judge0Id: 83, // Swift (5.2.3)
        monacoLang: 'swift',
        extension: '.swift',
        filename: 'main.swift',
        icon: '🦅',
        category: 'mobile'
    }
};

window.LANGUAGES = LANGUAGES;
