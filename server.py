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
import urllib.parse
import re
import subprocess
import tempfile
import time
import uuid
import threading
import queue

DEFAULT_PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(DIRECTORY, 'user_data')
os.makedirs(USER_DATA_DIR, exist_ok=True)

INTERACTIVE_SESSIONS = {}

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



def start_interactive_session(lang, code, files):
    # Cleanup any old sessions running for > 5 minutes
    now = time.time()
    for sid in list(INTERACTIVE_SESSIONS.keys()):
        s = INTERACTIVE_SESSIONS.get(sid)
        if s and (now - s.get('start_time', now) > 300):
            stop_interactive_session(sid)

    if lang in ('c', 'c++', 'cpp'):
        return _spawn_c_interactive(code, files, is_cpp=(lang in ('cpp', 'c++')))
    elif lang in ('python', 'python3', 'py'):
        return _spawn_python_interactive(code, files)
    elif lang == 'java' and JAVAC_BIN and JAVA_BIN:
        return _spawn_java_interactive(code, files)
    elif lang in ('javascript', 'js', 'node') and NODE_BIN:
        return _spawn_node_interactive(code, files)
    else:
        return {'supported': False, 'reason': 'Interactive mode not available for this language/environment'}


def _spawn_c_interactive(code, files, is_cpp=False):
    compiler = GPP_BIN if is_cpp else GCC_BIN
    if not compiler or not os.path.exists(compiler):
        return {'supported': False, 'reason': 'C/C++ compiler not available'}

    td = tempfile.TemporaryDirectory()
    src_ext = 'cpp' if is_cpp else 'c'
    src_name = f'main.{src_ext}'
    src_path = os.path.join(td.name, src_name)
    exe_path = os.path.join(td.name, 'main.exe')

    # Unbuffered stdout so printf/cout flushes immediately to terminal without waiting for newline
    unbuffered_header = """
#ifndef __DISABLE_BUFFERING_INJECTED
#define __DISABLE_BUFFERING_INJECTED
#include <stdio.h>
#ifdef __cplusplus
#include <iostream>
#endif
__attribute__((constructor)) void __disable_buffering_init(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
#ifdef __cplusplus
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);
#endif
}
#endif
"""
    final_code = unbuffered_header + "\n" + code
    with open(src_path, 'w', encoding='utf-8') as f:
        f.write(final_code)

    if files and len(files) > 1:
        for fl in files:
            fn = fl.get('name', '')
            if fn and fn != src_name:
                with open(os.path.join(td.name, fn), 'w', encoding='utf-8') as extra_f:
                    extra_f.write(fl.get('content', ''))

    env = os.environ.copy()
    mingw_dir = os.path.dirname(compiler)
    env['PATH'] = mingw_dir + ';' + env.get('PATH', '')

    comp_args = [compiler, '-O2', '-static-libgcc', src_path, '-o', exe_path]
    if is_cpp:
        comp_args.insert(3, '-static-libstdc++')

    try:
        comp = subprocess.run(comp_args, capture_output=True, text=True, env=env, timeout=12)
    except subprocess.TimeoutExpired:
        td.cleanup()
        return {'supported': True, 'isSuccess': False, 'compileError': True, 'output': 'Compilation timed out after 12s.'}

    if comp.returncode != 0:
        td.cleanup()
        return {
            'supported': True,
            'isSuccess': False,
            'compileError': True,
            'output': comp.stderr or 'Compilation error.'
        }

    try:
        proc = subprocess.Popen(
            [exe_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=0,
            env=env,
            cwd=td.name
        )
    except Exception as e:
        td.cleanup()
        return {'supported': True, 'isSuccess': False, 'compileError': False, 'output': f'Failed to launch executable: {e}'}

    return _register_session(proc, td, 'cpp' if is_cpp else 'c')


def _spawn_python_interactive(code, files):
    td = tempfile.TemporaryDirectory()
    src_path = os.path.join(td.name, 'main.py')
    with open(src_path, 'w', encoding='utf-8') as f:
        f.write(code)

    if files and len(files) > 1:
        for fl in files:
            fn = fl.get('name', '')
            if fn and fn != 'main.py':
                with open(os.path.join(td.name, fn), 'w', encoding='utf-8') as extra_f:
                    extra_f.write(fl.get('content', ''))

    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'

    try:
        proc = subprocess.Popen(
            [sys.executable, '-u', src_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=0,
            env=env,
            cwd=td.name
        )
    except Exception as e:
        td.cleanup()
        return {'supported': True, 'isSuccess': False, 'compileError': False, 'output': f'Failed to launch Python: {e}'}

    return _register_session(proc, td, 'python')


def _spawn_java_interactive(code, files):
    td = tempfile.TemporaryDirectory()
    src_path = os.path.join(td.name, 'Main.java')
    with open(src_path, 'w', encoding='utf-8') as f:
        f.write(code)

    comp = subprocess.run([JAVAC_BIN, src_path], capture_output=True, text=True, timeout=12)
    if comp.returncode != 0:
        td.cleanup()
        return {'supported': True, 'isSuccess': False, 'compileError': True, 'output': comp.stderr or 'Java compilation error.'}

    try:
        proc = subprocess.Popen(
            [JAVA_BIN, 'Main'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=0,
            cwd=td.name
        )
    except Exception as e:
        td.cleanup()
        return {'supported': True, 'isSuccess': False, 'compileError': False, 'output': f'Failed to launch Java: {e}'}

    return _register_session(proc, td, 'java')


def _spawn_node_interactive(code, files):
    td = tempfile.TemporaryDirectory()
    src_path = os.path.join(td.name, 'main.js')
    with open(src_path, 'w', encoding='utf-8') as f:
        f.write(code)

    try:
        proc = subprocess.Popen(
            [NODE_BIN, src_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=0,
            cwd=td.name
        )
    except Exception as e:
        td.cleanup()
        return {'supported': True, 'isSuccess': False, 'compileError': False, 'output': f'Failed to launch Node.js: {e}'}

    return _register_session(proc, td, 'javascript')


def _register_session(proc, td, lang):
    session_id = uuid.uuid4().hex
    q = queue.Queue()

    def reader():
        try:
            while True:
                ch = proc.stdout.read(1)
                if not ch:
                    break
                q.put(ch)
        except Exception:
            pass

    t = threading.Thread(target=reader, daemon=True)
    t.start()

    INTERACTIVE_SESSIONS[session_id] = {
        'proc': proc,
        'queue': q,
        'temp_dir': td,
        'thread': t,
        'start_time': time.time(),
        'lang': lang
    }

    return {
        'supported': True,
        'isSuccess': True,
        'sessionId': session_id,
        'status': 'running'
    }


def poll_interactive_session(session_id):
    session = INTERACTIVE_SESSIONS.get(session_id)
    if not session:
        return {'isDone': True, 'output': '', 'exitCode': 0}

    q = session['queue']
    proc = session['proc']

    parts = []
    while not q.empty():
        try:
            parts.append(q.get_nowait())
        except queue.Empty:
            break

    output = ''.join(parts)
    is_done = False
    exit_code = None

    if proc.poll() is not None:
        time.sleep(0.05)
        while not q.empty():
            try:
                parts.append(q.get_nowait())
            except queue.Empty:
                break
        output = ''.join(parts)
        is_done = True
        exit_code = proc.returncode
        try:
            session['temp_dir'].cleanup()
        except Exception:
            pass
        INTERACTIVE_SESSIONS.pop(session_id, None)

    elapsed_ms = round((time.time() - session['start_time']) * 1000)
    return {
        'output': output,
        'isDone': is_done,
        'exitCode': exit_code,
        'elapsedMs': elapsed_ms
    }


def write_interactive_session(session_id, user_input):
    session = INTERACTIVE_SESSIONS.get(session_id)
    if not session:
        return {'error': 'Session not found'}
    proc = session['proc']
    try:
        proc.stdin.write(user_input)
        proc.stdin.flush()
        return {'success': True}
    except Exception as e:
        return {'error': str(e)}


def stop_interactive_session(session_id):
    session = INTERACTIVE_SESSIONS.get(session_id)
    if not session:
        return {'success': True}
    proc = session['proc']
    try:
        proc.terminate()
        proc.kill()
    except Exception:
        pass
    try:
        session['temp_dir'].cleanup()
    except Exception:
        pass
    INTERACTIVE_SESSIONS.pop(session_id, None)
    return {'success': True}


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

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/user/get-code':
            qs = urllib.parse.parse_qs(parsed.query)
            uid = qs.get('uid', [''])[0]
            lang = qs.get('language', [''])[0].lower()
            safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
            safe_lang = re.sub(r'[^a-zA-Z0-9_-]', '_', lang)
            file_path = os.path.join(USER_DATA_DIR, safe_uid, f"{safe_lang}.json")
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    res = json.dumps({"found": True, "data": data}).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Content-Length', str(len(res)))
                    self.end_headers()
                    self.wfile.write(res)
                    return
                except Exception:
                    pass
            res = json.dumps({"found": False}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(res)))
            self.end_headers()
            self.wfile.write(res)
            return

        elif parsed.path == '/api/user/get-all-codes':
            qs = urllib.parse.parse_qs(parsed.query)
            uid = qs.get('uid', [''])[0]
            safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
            user_dir = os.path.join(USER_DATA_DIR, safe_uid)
            all_codes = {}
            if os.path.exists(user_dir):
                for fname in os.listdir(user_dir):
                    if fname.endswith('.json'):
                        lang_name = fname[:-5]
                        try:
                            with open(os.path.join(user_dir, fname), 'r', encoding='utf-8') as f:
                                all_codes[lang_name] = json.load(f)
                        except Exception:
                            pass
            res = json.dumps({"found": True, "codes": all_codes}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(res)))
            self.end_headers()
            self.wfile.write(res)
            return

        elif parsed.path == '/api/user/snippets':
            qs = urllib.parse.parse_qs(parsed.query)
            uid = qs.get('uid', [''])[0]
            safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
            snippets_file = os.path.join(USER_DATA_DIR, safe_uid, "snippets.json")
            snippets = []
            if os.path.exists(snippets_file):
                try:
                    with open(snippets_file, 'r', encoding='utf-8') as f:
                        snippets = json.load(f)
                except Exception:
                    snippets = []
            res = json.dumps({"found": True, "snippets": snippets}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(res)))
            self.end_headers()
            self.wfile.write(res)
            return

        elif parsed.path == '/api/session/poll':
            qs = urllib.parse.parse_qs(parsed.query)
            session_id = qs.get('id', [''])[0]
            data = poll_interactive_session(session_id)
            res = json.dumps(data).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(res)))
            self.end_headers()
            self.wfile.write(res)
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/run-interactive':
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
            files = data.get('files', [])

            result = start_interactive_session(lang, code, files)
            response_bytes = json.dumps(result).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        elif self.path == '/api/session/write':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid JSON"}')
                return

            session_id = data.get('sessionId') or data.get('id', '')
            user_input = data.get('input', '')
            result = write_interactive_session(session_id, user_input)
            response_bytes = json.dumps(result).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        elif self.path == '/api/session/stop':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                data = {}

            session_id = data.get('sessionId') or data.get('id', '')
            result = stop_interactive_session(session_id)
            response_bytes = json.dumps(result).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
            return

        elif self.path == '/api/run':
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

        elif self.path == '/api/user/save-code':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                uid = data.get('uid', '')
                lang = data.get('language', '').lower()
                if not uid or not lang:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b'{"error": "Missing uid or language"}')
                    return
                safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
                safe_lang = re.sub(r'[^a-zA-Z0-9_-]', '_', lang)
                user_dir = os.path.join(USER_DATA_DIR, safe_uid)
                os.makedirs(user_dir, exist_ok=True)
                file_path = os.path.join(user_dir, f"{safe_lang}.json")
                data['saved_at'] = time.time()
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                res = json.dumps({"success": True, "saved_at": data['saved_at']}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

        elif self.path == '/api/user/save-snippet':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                uid = data.get('uid', 'guest')
                safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
                user_dir = os.path.join(USER_DATA_DIR, safe_uid)
                os.makedirs(user_dir, exist_ok=True)
                snippets_file = os.path.join(user_dir, "snippets.json")
                snippets = []
                if os.path.exists(snippets_file):
                    try:
                        with open(snippets_file, 'r', encoding='utf-8') as f:
                            snippets = json.load(f)
                    except Exception:
                        snippets = []
                sid = data.get('id')
                idx = next((i for i, s in enumerate(snippets) if s.get('id') == sid), None)
                if idx is not None:
                    snippets[idx] = data
                else:
                    snippets.insert(0, data)
                with open(snippets_file, 'w', encoding='utf-8') as f:
                    json.dump(snippets, f, indent=2)
                res = json.dumps({"success": True, "snippets_count": len(snippets)}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

        elif self.path == '/api/user/delete-snippet':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                uid = data.get('uid', 'guest')
                sid = data.get('id', '')
                safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
                snippets_file = os.path.join(USER_DATA_DIR, safe_uid, "snippets.json")
                if os.path.exists(snippets_file):
                    with open(snippets_file, 'r', encoding='utf-8') as f:
                        snippets = json.load(f)
                    snippets = [s for s in snippets if s.get('id') != sid]
                    with open(snippets_file, 'w', encoding='utf-8') as f:
                        json.dump(snippets, f, indent=2)
                res = json.dumps({"success": True}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
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
