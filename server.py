#!/usr/bin/env python3
"""
CompilerG - Local Development Server
High-speed execution server with OneCompiler Turbo Engine,
local subprocess runner, Wandbox fallback, and multi-file support.
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import json
import urllib.request
import subprocess
import tempfile
import time

DEFAULT_PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

ONECOMPILER_MAP = {
    'c': {'name': 'C', 'mode': 'c', 'ext': 'c', 'main': 'main.c'},
    'cpp': {'name': 'C++', 'mode': 'cpp', 'ext': 'cpp', 'main': 'main.cpp'},
    'java': {'name': 'Java', 'mode': 'java', 'ext': 'java', 'main': 'Main.java'},
    'python': {'name': 'Python 3', 'mode': 'python', 'ext': 'py', 'main': 'main.py'},
    'python3': {'name': 'Python 3', 'mode': 'python', 'ext': 'py', 'main': 'main.py'},
    'py': {'name': 'Python 3', 'mode': 'python', 'ext': 'py', 'main': 'main.py'},
    'javascript': {'name': 'JavaScript', 'mode': 'javascript', 'ext': 'js', 'main': 'main.js'},
    'js': {'name': 'JavaScript', 'mode': 'javascript', 'ext': 'js', 'main': 'main.js'},
    'node': {'name': 'JavaScript', 'mode': 'javascript', 'ext': 'js', 'main': 'main.js'},
    'typescript': {'name': 'TypeScript', 'mode': 'typescript', 'ext': 'ts', 'main': 'main.ts'},
    'ts': {'name': 'TypeScript', 'mode': 'typescript', 'ext': 'ts', 'main': 'main.ts'},
    'rust': {'name': 'Rust', 'mode': 'rust', 'ext': 'rs', 'main': 'main.rs'},
    'go': {'name': 'Go', 'mode': 'go', 'ext': 'go', 'main': 'main.go'},
    'csharp': {'name': 'C#', 'mode': 'csharp', 'ext': 'cs', 'main': 'main.cs'},
    'cs': {'name': 'C#', 'mode': 'csharp', 'ext': 'cs', 'main': 'main.cs'},
    'php': {'name': 'PHP', 'mode': 'php', 'ext': 'php', 'main': 'main.php'},
    'ruby': {'name': 'Ruby', 'mode': 'ruby', 'ext': 'rb', 'main': 'main.rb'},
    'bash': {'name': 'Bash', 'mode': 'bash', 'ext': 'sh', 'main': 'main.sh'},
    'sh': {'name': 'Bash', 'mode': 'bash', 'ext': 'sh', 'main': 'main.sh'},
    'kotlin': {'name': 'Kotlin', 'mode': 'kotlin', 'ext': 'kt', 'main': 'Main.kt'},
    'swift': {'name': 'Swift', 'mode': 'swift', 'ext': 'swift', 'main': 'main.swift'},
}

WANDBOX_MAP = {
    'cpp': 'gcc-head',
    'c': 'gcc-head',
    'rust': 'rust-head',
    'go': 'go-head',
    'java': 'openjdk-head',
    'csharp': 'mono-head',
    'php': 'php-head',
    'ruby': 'ruby-head',
    'bash': 'bash',
    'swift': 'swift-head',
}

# ── Local Compilers Auto-Discovery ───────────────────────────────────────────
def _find_binary(candidates):
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None

GPP_BIN = _find_binary([
    r'C:\Program Files\CodeBlocks\MinGW\bin\g++.exe',
    r'C:\MinGW\bin\g++.exe',
    r'C:\msys64\mingw64\bin\g++.exe',
])
GCC_BIN = _find_binary([
    r'C:\Program Files\CodeBlocks\MinGW\bin\gcc.exe',
    r'C:\MinGW\bin\gcc.exe',
    r'C:\msys64\mingw64\bin\gcc.exe',
])
JAVAC_BIN = _find_binary([
    r'C:\Program Files\Android\Android Studio\jbr\bin\javac.exe',
    r'C:\Program Files\Java\jdk-21\bin\javac.exe',
    r'C:\Program Files\Eclipse Adoptium\jdk-21\bin\javac.exe',
])
JAVA_BIN = _find_binary([
    r'C:\Program Files\Android\Android Studio\jbr\bin\java.exe',
    r'C:\Program Files\Java\jdk-21\bin\java.exe',
    r'C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe',
])
NODE_BIN = _find_binary([
    r'C:\Program Files\nodejs\node.exe',
    r'C:\Program Files (x86)\nodejs\node.exe',
])


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def address_string(self):
        # Prevent slow reverse DNS lookup on Windows
        return self.client_address[0]

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/run':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid JSON"}')
                return

            lang = data.get('language', '').lower()
            code = data.get('code', '')
            stdin = data.get('stdin', '')
            files = data.get('files', [])

            result = self.execute_code(lang, code, stdin, files)
            response_bytes = json.dumps(result).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        else:
            self.send_response(404)
            self.end_headers()

    def execute_code(self, lang, code, stdin, files):
        t0 = time.perf_counter()

        # 1. Local Python Runner
        if lang in ('python', 'python3', 'py') and (not files or len(files) <= 1):
            with tempfile.TemporaryDirectory() as td:
                script_path = os.path.join(td, 'main.py')
                with open(script_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                try:
                    res = subprocess.run(
                        [sys.executable, script_path],
                        input=stdin or '',
                        capture_output=True,
                        text=True,
                        timeout=12
                    )
                    elapsed_sec = time.perf_counter() - t0
                    is_success = res.returncode == 0
                    return {
                        'supported': True,
                        'isSuccess': is_success,
                        'isError': not is_success,
                        'statusCode': 3 if is_success else 11,
                        'statusDescription': 'Accepted' if is_success else 'Runtime Error',
                        'stdout': res.stdout or '',
                        'stderr': res.stderr or '',
                        'compileOutput': '',
                        'time': f'{round(elapsed_sec * 1000)} ms',
                        'memory': 'Local Turbo',
                        'engine': 'Local Turbo Python',
                        'elapsedMs': round(elapsed_sec * 1000)
                    }
                except subprocess.TimeoutExpired:
                    elapsed_sec = time.perf_counter() - t0
                    return {
                        'supported': True,
                        'isSuccess': False,
                        'isError': True,
                        'statusCode': 5,
                        'statusDescription': 'Time Limit Exceeded (TLE)',
                        'stdout': '',
                        'stderr': 'Time Limit Exceeded: Execution took longer than 12 seconds.\nCheck for infinite loops or heavy operations.',
                        'compileOutput': '',
                        'time': f'{round(elapsed_sec * 1000)} ms',
                        'memory': 'Local Turbo',
                        'engine': 'Local Turbo Python',
                        'elapsedMs': round(elapsed_sec * 1000)
                    }
                except Exception:
                    pass

        # 2. Local MinGW C++ Runner (Sub-second execution)
        if lang in ('cpp', 'c++') and GPP_BIN:
            cpp_res = self.execute_local_cpp(code, stdin, files, t0)
            if cpp_res:
                return cpp_res

        # 3. Local MinGW C Runner
        if lang == 'c' and GCC_BIN:
            c_res = self.execute_local_c(code, stdin, files, t0)
            if c_res:
                return c_res

        # 4. Local Java 21 Runner
        if lang == 'java' and JAVAC_BIN and JAVA_BIN:
            java_res = self.execute_local_java(code, stdin, files, t0)
            if java_res:
                return java_res

        # 5. Local Node.js for JavaScript
        if lang in ('javascript', 'js', 'node') and NODE_BIN and (not files or len(files) <= 1):
            with tempfile.TemporaryDirectory() as td:
                script_path = os.path.join(td, 'main.js')
                with open(script_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                try:
                    res = subprocess.run(
                        [NODE_BIN, script_path],
                        input=stdin or '',
                        capture_output=True,
                        text=True,
                        timeout=12
                    )
                    elapsed_sec = time.perf_counter() - t0
                    is_success = res.returncode == 0
                    return {
                        'supported': True,
                        'isSuccess': is_success,
                        'isError': not is_success,
                        'statusCode': 3 if is_success else 11,
                        'statusDescription': 'Accepted' if is_success else 'Runtime Error',
                        'stdout': res.stdout or '',
                        'stderr': res.stderr or '',
                        'compileOutput': '',
                        'time': f'{round(elapsed_sec * 1000)} ms',
                        'memory': 'Local Turbo',
                        'engine': 'Local Turbo Node.js',
                        'elapsedMs': round(elapsed_sec * 1000)
                    }
                except subprocess.TimeoutExpired:
                    elapsed_sec = time.perf_counter() - t0
                    return {
                        'supported': True,
                        'isSuccess': False,
                        'isError': True,
                        'statusCode': 5,
                        'statusDescription': 'Time Limit Exceeded (TLE)',
                        'stdout': '',
                        'stderr': 'Time Limit Exceeded: JavaScript process took longer than 12 seconds.',
                        'compileOutput': '',
                        'time': f'{round(elapsed_sec * 1000)} ms',
                        'memory': 'Local Turbo',
                        'engine': 'Local Turbo Node.js',
                        'elapsedMs': round(elapsed_sec * 1000)
                    }
                except Exception:
                    pass

        # 6. OneCompiler Turbo Engine (Remote execution for Rust, Go, PHP, etc.)
        oc_result = self.execute_onecompiler(lang, code, stdin, files)
        if oc_result and oc_result.get('supported'):
            return oc_result

        # 7. Wandbox Turbo Fallback
        wb_result = self.execute_wandbox(lang, code, stdin)
        if wb_result and wb_result.get('supported'):
            return wb_result

        return {'supported': False, 'reason': 'Remote runner fallback'}

    def execute_local_cpp(self, code, stdin, files, t0):
        with tempfile.TemporaryDirectory() as td:
            src_path = os.path.join(td, 'main.cpp')
            exe_path = os.path.join(td, 'main.exe')
            with open(src_path, 'w', encoding='utf-8') as f:
                f.write(code)

            if files and len(files) > 1:
                for fl in files:
                    fn = fl.get('name', '')
                    if fn and fn != 'main.cpp':
                        with open(os.path.join(td, fn), 'w', encoding='utf-8') as extra_f:
                            extra_f.write(fl.get('content', ''))

            env = os.environ.copy()
            mingw_dir = os.path.dirname(GPP_BIN)
            env['PATH'] = mingw_dir + ';' + env.get('PATH', '')

            try:
                comp = subprocess.run(
                    [GPP_BIN, '-O2', '-static-libgcc', '-static-libstdc++', src_path, '-o', exe_path],
                    capture_output=True, text=True, env=env, timeout=12
                )
            except subprocess.TimeoutExpired:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 5, 'statusDescription': 'Compilation Timeout',
                    'stdout': '', 'stderr': 'Compilation timed out after 12 seconds.',
                    'compileOutput': 'Error: Compilation exceeded time limit.',
                    'time': f'{round(elapsed_sec * 1000)} ms', 'memory': 'Local MinGW C++',
                    'engine': 'Local Turbo MinGW C++', 'elapsedMs': round(elapsed_sec * 1000)
                }

            if comp.returncode != 0:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 6, 'statusDescription': 'Compilation Error',
                    'stdout': '', 'stderr': comp.stderr or '',
                    'compileOutput': comp.stderr or '',
                    'time': f'{round(elapsed_sec * 1000)} ms', 'memory': 'Local MinGW C++',
                    'engine': 'Local Turbo MinGW C++', 'elapsedMs': round(elapsed_sec * 1000)
                }

            try:
                run_res = subprocess.run(
                    [exe_path], input=stdin or '', capture_output=True, text=True, env=env, timeout=12
                )
                elapsed_sec = time.perf_counter() - t0
                is_success = run_res.returncode == 0
                return {
                    'supported': True, 'isSuccess': is_success, 'isError': not is_success,
                    'statusCode': 3 if is_success else 11,
                    'statusDescription': 'Accepted' if is_success else 'Runtime Error',
                    'stdout': run_res.stdout or '', 'stderr': run_res.stderr or '',
                    'compileOutput': '', 'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Local MinGW C++', 'engine': 'Local Turbo MinGW C++',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except subprocess.TimeoutExpired:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 5, 'statusDescription': 'Time Limit Exceeded (TLE)',
                    'stdout': '', 'stderr': 'Time Limit Exceeded: Process exceeded 12 seconds limit.\nCheck for infinite loops or heavy operations.',
                    'compileOutput': '', 'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Local MinGW C++', 'engine': 'Local Turbo MinGW C++',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except Exception:
                return None

    def execute_local_c(self, code, stdin, files, t0):
        with tempfile.TemporaryDirectory() as td:
            src_path = os.path.join(td, 'main.c')
            exe_path = os.path.join(td, 'main.exe')
            with open(src_path, 'w', encoding='utf-8') as f:
                f.write(code)

            if files and len(files) > 1:
                for fl in files:
                    fn = fl.get('name', '')
                    if fn and fn != 'main.c':
                        with open(os.path.join(td, fn), 'w', encoding='utf-8') as extra_f:
                            extra_f.write(fl.get('content', ''))

            env = os.environ.copy()
            mingw_dir = os.path.dirname(GCC_BIN)
            env['PATH'] = mingw_dir + ';' + env.get('PATH', '')

            try:
                comp = subprocess.run(
                    [GCC_BIN, '-O2', '-static-libgcc', src_path, '-o', exe_path],
                    capture_output=True, text=True, env=env, timeout=12
                )
            except subprocess.TimeoutExpired:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 5, 'statusDescription': 'Compilation Timeout',
                    'stdout': '', 'stderr': 'Compilation timed out after 12 seconds.',
                    'compileOutput': 'Error: Compilation exceeded time limit.',
                    'time': f'{round(elapsed_sec * 1000)} ms', 'memory': 'Local MinGW C',
                    'engine': 'Local Turbo MinGW C', 'elapsedMs': round(elapsed_sec * 1000)
                }

            if comp.returncode != 0:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 6, 'statusDescription': 'Compilation Error',
                    'stdout': '', 'stderr': comp.stderr or '',
                    'compileOutput': comp.stderr or '',
                    'time': f'{round(elapsed_sec * 1000)} ms', 'memory': 'Local MinGW C',
                    'engine': 'Local Turbo MinGW C', 'elapsedMs': round(elapsed_sec * 1000)
                }

            try:
                run_res = subprocess.run(
                    [exe_path], input=stdin or '', capture_output=True, text=True, env=env, timeout=12
                )
                elapsed_sec = time.perf_counter() - t0
                is_success = run_res.returncode == 0
                return {
                    'supported': True, 'isSuccess': is_success, 'isError': not is_success,
                    'statusCode': 3 if is_success else 11,
                    'statusDescription': 'Accepted' if is_success else 'Runtime Error',
                    'stdout': run_res.stdout or '', 'stderr': run_res.stderr or '',
                    'compileOutput': '', 'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Local MinGW C', 'engine': 'Local Turbo MinGW C',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except subprocess.TimeoutExpired:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 5, 'statusDescription': 'Time Limit Exceeded (TLE)',
                    'stdout': '', 'stderr': 'Time Limit Exceeded: Process exceeded 12 seconds limit.\nCheck for infinite loops or heavy operations.',
                    'compileOutput': '', 'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Local MinGW C', 'engine': 'Local Turbo MinGW C',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except Exception:
                return None

    def execute_local_java(self, code, stdin, files, t0):
        with tempfile.TemporaryDirectory() as td:
            import re
            m = re.search(r'public\s+class\s+([A-Za-z0-9_]+)', code)
            class_name = m.group(1) if m else 'Main'
            src_path = os.path.join(td, f'{class_name}.java')
            with open(src_path, 'w', encoding='utf-8') as f:
                f.write(code)

            if files and len(files) > 1:
                for fl in files:
                    fn = fl.get('name', '')
                    if fn and fn != f'{class_name}.java':
                        with open(os.path.join(td, fn), 'w', encoding='utf-8') as extra_f:
                            extra_f.write(fl.get('content', ''))

            try:
                comp = subprocess.run(
                    [JAVAC_BIN, src_path],
                    capture_output=True, text=True, timeout=12
                )
            except subprocess.TimeoutExpired:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 5, 'statusDescription': 'Compilation Timeout',
                    'stdout': '', 'stderr': 'Compilation timed out after 12 seconds.',
                    'compileOutput': 'Error: Compilation exceeded time limit.',
                    'time': f'{round(elapsed_sec * 1000)} ms', 'memory': 'Local Java 21',
                    'engine': 'Local Turbo Java 21', 'elapsedMs': round(elapsed_sec * 1000)
                }

            if comp.returncode != 0:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 6, 'statusDescription': 'Compilation Error',
                    'stdout': '', 'stderr': comp.stderr or '',
                    'compileOutput': comp.stderr or '',
                    'time': f'{round(elapsed_sec * 1000)} ms', 'memory': 'Local Java 21',
                    'engine': 'Local Turbo Java 21', 'elapsedMs': round(elapsed_sec * 1000)
                }

            try:
                run_res = subprocess.run(
                    [JAVA_BIN, '-cp', td, class_name],
                    input=stdin or '', capture_output=True, text=True, timeout=12
                )
                elapsed_sec = time.perf_counter() - t0
                is_success = run_res.returncode == 0
                return {
                    'supported': True, 'isSuccess': is_success, 'isError': not is_success,
                    'statusCode': 3 if is_success else 11,
                    'statusDescription': 'Accepted' if is_success else 'Runtime Error',
                    'stdout': run_res.stdout or '', 'stderr': run_res.stderr or '',
                    'compileOutput': '', 'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Local Java 21', 'engine': 'Local Turbo Java 21',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except subprocess.TimeoutExpired:
                elapsed_sec = time.perf_counter() - t0
                return {
                    'supported': True, 'isSuccess': False, 'isError': True,
                    'statusCode': 5, 'statusDescription': 'Time Limit Exceeded (TLE)',
                    'stdout': '', 'stderr': 'Time Limit Exceeded: Java process exceeded 12 seconds limit.\nCheck for infinite loops or heavy operations.',
                    'compileOutput': '', 'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Local Java 21', 'engine': 'Local Turbo Java 21',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except Exception:
                return None

    def execute_onecompiler(self, lang, code, stdin, files):
        cfg = ONECOMPILER_MAP.get(lang)
        if not cfg:
            return None

        t0 = time.perf_counter()
        file_payload = []
        if files and isinstance(files, list) and len(files) > 0:
            for f in files:
                fname = f.get('name', '').strip()
                fcontent = f.get('content', '')
                if fname:
                    file_payload.append({'name': fname, 'content': fcontent})

        if not file_payload:
            file_payload = [{'name': cfg['main'], 'content': code}]

        payload = json.dumps({
            "name": cfg['name'],
            "title": cfg['name'],
            "version": "latest",
            "mode": cfg['mode'],
            "description": None,
            "extension": cfg['ext'],
            "languageType": "programming",
            "active": True,
            "properties": {
                "language": cfg['mode'],
                "docs": True,
                "tutorials": True,
                "cheatsheets": True,
                "files": file_payload,
                "stdin": stdin or ""
            },
            "visibility": "public"
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://onecompiler.com/api/code/exec',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': f'https://onecompiler.com/{cfg["mode"]}',
                'Origin': 'https://onecompiler.com'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                elapsed_sec = time.perf_counter() - t0
                stdout = data.get('stdout') or ''
                stderr = data.get('stderr') or ''
                exception = data.get('exception') or ''
                if exception and not stderr:
                    stderr = str(exception)

                comp_time = data.get('compilationTime')
                exec_time = data.get('executionTime')
                mem_bytes = data.get('memoryUsed') or 0

                is_success = not stderr and not exception

                if comp_time is not None or exec_time is not None:
                    total_ms = (comp_time or 0) + (exec_time or 0)
                    time_display = f"{total_ms} ms"
                else:
                    time_display = f"{round(elapsed_sec * 1000)} ms"

                memory_display = f"{round(mem_bytes / 1024)} KB" if mem_bytes else "OneCompiler"

                return {
                    'supported': True,
                    'isSuccess': is_success,
                    'isError': not is_success,
                    'statusCode': 3 if is_success else 11,
                    'statusDescription': 'Accepted' if is_success else 'Compile/Runtime Error',
                    'stdout': stdout,
                    'stderr': stderr,
                    'compileOutput': '',
                    'time': time_display,
                    'memory': memory_display,
                    'engine': 'OneCompiler Turbo',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
        except Exception:
            return None

    def execute_wandbox(self, lang, code, stdin):
        compiler_name = WANDBOX_MAP.get(lang)
        if not compiler_name:
            return None

        t0 = time.perf_counter()
        try:
            payload = json.dumps({
                'compiler': compiler_name,
                'code': code,
                'stdin': stdin or ''
            }).encode('utf-8')

            req = urllib.request.Request(
                'https://wandbox.org/api/compile.json',
                data=payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                wb_res = json.loads(resp.read().decode('utf-8'))
                elapsed_sec = time.perf_counter() - t0
                wb_status = wb_res.get('status', '0')
                is_success = str(wb_status) == '0'
                stdout = wb_res.get('program_output', '')
                stderr = (wb_res.get('compiler_error', '') + '\n' + wb_res.get('program_error', '')).strip()
                compile_msg = wb_res.get('compiler_message', '')
                return {
                    'supported': True,
                    'isSuccess': is_success,
                    'isError': not is_success,
                    'statusCode': 3 if is_success else 11,
                    'statusDescription': 'Accepted' if is_success else 'Compile/Runtime Error',
                    'stdout': stdout,
                    'stderr': stderr,
                    'compileOutput': compile_msg,
                    'time': f'{elapsed_sec:.2f}s',
                    'memory': 'Wandbox Turbo',
                    'engine': 'Wandbox Turbo',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
        except Exception:
            return None

def run():
    os.chdir(DIRECTORY)
    port = DEFAULT_PORT
    httpd = None
    for p in range(DEFAULT_PORT, DEFAULT_PORT + 20):
        try:
            class ThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
                daemon_threads = True
                allow_reuse_address = True
            httpd = ThreadingServer(("", p), Handler)
            port = p
            break
        except OSError:
            continue

    if not httpd:
        print("Error: Could not bind to any port in range 3000-3020.")
        sys.exit(1)

    print("==================================================")
    print("CompilerG Development Server is Running!")
    print(f"URL: http://localhost:{port}")
    print(f"Serving directory: {DIRECTORY}")
    print("Press Ctrl+C to stop the server.")
    print("==================================================")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == '__main__':
    run()
