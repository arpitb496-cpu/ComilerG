# 🚀 CompilerG - Online Code Compiler & AI Runner

An ultra-modern, high-performance online code editor and compiler web application inspired by **OneCompiler**, featuring **Monaco Editor (VS Code Engine)**, **15+ Programming Languages**, **Standard Input (STDIN) Execution**, and **CompilerG AI Debugger**.

![CompilerG Banner](https://img.shields.io/badge/CompilerG-AI%20Powered-6366f1?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-15%2B%20Supported-10b981?style=for-the-badge)
![Editor](https://img.shields.io/badge/Editor-Monaco%20VS%20Code-38bdf8?style=for-the-badge)

---

## ✨ Features

- **VS Code Monaco Editor**:
  - Full syntax highlighting, line numbers, code folding, auto-closing brackets, and multi-cursor editing.
  - Dark Mode (`compilerg-dark`) and Light Mode (`compilerg-light`) with custom color schemes.
  - Configurable font size (12px to 20px), minimap toggle, and document formatter (`Shift+Alt+F`).

- **🤖 CompilerG AI Debugger & Assistant (Like OneCompiler)**:
  - **Dynamic Error Detection**: Automatically surfaces a **"🤖 Fix with AI"** badge when compilation or runtime errors occur.
  - **Error Line Highlighting**: Pinpoints the exact line number in the Monaco Editor with an inline red indicator.
  - **Dual-Engine AI**:
    1. **Instant Offline Diagnostic Engine**: Instantly diagnoses syntax errors, missing semicolons/brackets, undeclared variables, indentation errors, and segmentation faults without requiring any API key.
    2. **Google Gemini AI Integration**: Connects with free Gemini models (stored securely in browser `localStorage`) for deep code explanations, algorithmic optimization, and reasoning.
  - **"Apply Fix to Editor"**: One-click button that automatically updates your code in the editor with the proposed fix.

- **15+ Programming Languages**:
  - **Python 3** (3.12)
  - **C++** (GCC 14.1)
  - **C** (GCC 14.1)
  - **Java** (JDK 17)
  - **JavaScript** (Node.js 22)
  - **TypeScript** (5.6)
  - **Go** (1.23)
  - **Rust** (1.85)
  - **C#** (Mono 6.6)
  - **PHP** (8.3)
  - **Ruby** (2.7)
  - **Bash** (Shell)
  - **Kotlin** (2.1)
  - **Swift** (5.2)
  - **HTML / CSS / JS** (Interactive Live Sandbox with real-time preview)

- **Interactive Standard Input (STDIN)**:
  - Supports interactive user inputs (`cin >>`, `input()`, `scanf`, `Scanner(System.in)`, `readLine()`).

- **Execution Metrics & Performance**:
  - Displays real-time stdout, stderr, execution time (in seconds/ms), and memory consumption (KB/MB).
  - Status badges: `ACCEPTED`, `COMPILATION ERROR`, `RUNTIME ERROR`, `TIME LIMIT EXCEEDED`.

- **Developer Productivity**:
  - **Boilerplates**: Pre-loaded starter code for all 15+ languages.
  - **Auto-Save**: Code is automatically preserved per language in `localStorage`.
  - **Quick Actions**: Run (`Ctrl+Enter`), Reset to Template, Copy Code, Download File (`.py`, `.cpp`, `.java`, etc.).
  - **Draggable Split Screen**: Smooth draggable divider between editor and console.

---

## 🚀 Quick Start

### Running Locally with Python:
Open terminal in the project directory and execute:
```bash
python server.py
```
Open your browser at:
```
http://localhost:5000
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl` + `Enter` | Run Code |
| `Ctrl` + `S` | Save Code Bookmark |
| `Ctrl` + `B` | Toggle AI Debugger Drawer |
| `Ctrl` + `K` | Clear Console Output |
| `Shift` + `Alt` + `F` | Format Document |

---

## 🛠️ Project Structure

```
CompilerG/
├── index.html              # Main HTML5 layout & workspace
├── package.json            # NPM scripts for verification & Ralph loop
├── .coderabbit.yaml        # CodeRabbit automated review configuration
├── .roomodes               # Roo Code custom agent modes (Architect, Debugger, QA)
├── .clinerules             # Roo Code development guidelines & safety rules
├── .planning/              # GSD Core specification, roadmap, and state
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   └── config.json
├── css/
│   └── style.css           # Modern dark UI, glassmorphism & responsive styles
├── js/
│   ├── languages.js        # Language definitions & compiler IDs
│   ├── boilerplates.js     # Default starter code for all languages
│   ├── editor.js           # Monaco Editor manager & theme loader
│   ├── executor.js         # Judge0 CE API & Web sandbox runner
│   ├── ai_debugger.js      # CompilerG AI diagnosis & Gemini integration
│   └── app.js              # Application state, UI events & resize controller
├── scripts/
│   ├── verify_project.js   # 98-point automated health check suite
│   └── ralph_loop.js       # Autonomous Ralph Loop self-healing engine
├── server.py               # Lightweight local Python server
└── README.md               # Documentation
```

---

## 🤖 Agentic AI & Verification Tooling

CompilerG is configured with modern spec-driven and autonomous developer tooling:

- **GSD Core**: Spec-driven development framework located in `.planning/` (`PROJECT.md`, `ROADMAP.md`, `STATE.md`).
- **CodeRabbit**: Pull request & code quality inspection configured in `.coderabbit.yaml`.
- **Roo Code**: Custom development modes (`.roomodes`) and architectural rules (`.clinerules`).
- **🔁 Ralph Loop**: Continuous self-healing verification engine (`scripts/ralph_loop.js`).
  ```bash
  npm run ralph-loop        # Single-pass verification until convergence
  npm run ralph-loop:watch  # Continuous watch mode
  npm test                  # Run project verification suite
  ```

