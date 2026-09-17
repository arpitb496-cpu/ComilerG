# 🚀 CompilerG - Project Specification

## 1. Vision & Overview
**CompilerG** is an online code editor, compiler, and AI runner inspired by OneCompiler. It empowers developers and students to write, compile, run, debug, and share code in 15+ programming languages directly in their browser with instant execution feedback and intelligent AI-assisted debugging.

## 2. Core Technical Architecture
- **Frontend Core**: Semantic HTML5, Glassmorphic CSS3 Design System with dark/light themes, Vanilla ES6+ JavaScript modules.
- **Code Editor**: Monaco Editor (VS Code engine) loaded via AMD with an instant-boot fallback textarea for zero-latency startup.
- **Compilation Engine**: Judge0 CE Public REST API with asynchronous submission polling + Client-side sandboxed iframe for HTML/CSS/JS.
- **AI Debugging Engine**:
  - *Engine 1 (Offline Heuristics)*: Instant regex-based syntax and runtime error diagnostics without API keys.
  - *Engine 2 (Cloud AI)*: Google Gemini API integration with multi-turn reasoning and one-click code fix application.
- **Local Dev Server**: Zero-dependency Python 3 HTTP server (`server.py`) with multithreading, CORS headers, and MIME handling.

## 3. Tooling Ecosystem
- **GSD Core**: Spec-driven development framework managing context, roadmaps, and execution phases.
- **CodeRabbit**: Automated assertive code review guidelines defined in `.coderabbit.yaml`.
- **Roo Code**: Custom development modes (`.roomodes`) and quality rules (`.clinerules`).
- **Ralph Loop**: Automated self-healing verification loop (`scripts/ralph_loop.js`) ensuring zero error regressions.

## 4. Quality Guarantees
- 100% test passing across all 15 language definitions and boilerplates.
- Full DOM ID reference synchronization between HTML and JavaScript.
- Clean theme normalization (`compilerg-dark` and `compilerg-light`).
- Strict XSS sanitization of all execution stdout, stderr, and code snippets.
