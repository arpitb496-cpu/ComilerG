#!/usr/bin/env python3
"""
CompilerG - Production Web Server (Flask + Gunicorn for Render)
Serves the frontend and handles code execution via OneCompiler & Wandbox APIs.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import json
import re
import subprocess
import tempfile
import time
import requests as http_requests

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(DIRECTORY, 'user_data')
os.makedirs(USER_DATA_DIR, exist_ok=True)

# ── Language Configurations ──────────────────────────────────────────────────
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
    'cpp': 'gcc-head', 'c': 'gcc-head', 'rust': 'rust-head',
    'go': 'go-head', 'java': 'openjdk-head', 'csharp': 'mono-head',
    'php': 'php-head', 'ruby': 'ruby-head', 'bash': 'bash', 'swift': 'swift-head',
}

# ── Static File Routes ───────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(DIRECTORY, 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(DIRECTORY, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(DIRECTORY, 'js'), filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(DIRECTORY, 'assets'), filename)

# ── Health Check ──────────────────────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'engine': 'CompilerG Production'}), 200

# ── Code Execution API ───────────────────────────────────────────────────────
@app.route('/api/run', methods=['POST'])
def run_code():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    lang = data.get('language', '').lower()
    code = data.get('code', '')
    stdin = data.get('stdin', '')
    files = data.get('files', [])

    result = execute_code(lang, code, stdin, files)
    return jsonify(result)


@app.route('/api/user/save-code', methods=['POST'])
def save_user_code():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    uid = data.get('uid', '')
    lang = data.get('language', '').lower()
    if not uid or not lang:
        return jsonify({'error': 'Missing uid or language'}), 400

    safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
    safe_lang = re.sub(r'[^a-zA-Z0-9_-]', '_', lang)
    user_dir = os.path.join(USER_DATA_DIR, safe_uid)
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, f"{safe_lang}.json")
    data['saved_at'] = time.time()
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True, 'saved_at': data['saved_at']})


@app.route('/api/user/get-code', methods=['GET'])
def get_user_code():
    uid = request.args.get('uid', '')
    lang = request.args.get('language', '').lower()
    safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '_', uid)
    safe_lang = re.sub(r'[^a-zA-Z0-9_-]', '_', lang)
    file_path = os.path.join(USER_DATA_DIR, safe_uid, f"{safe_lang}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify({'found': True, 'data': data})
        except Exception:
            pass
    return jsonify({'found': False})


@app.route('/api/user/get-all-codes', methods=['GET'])
def get_all_user_codes():
    uid = request.args.get('uid', '')
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
    return jsonify({'found': True, 'codes': all_codes})


def execute_code(lang, code, stdin, files):
    t0 = time.perf_counter()

    # 1. Local Python execution (Render has Python installed)
    if lang in ('python', 'python3', 'py') and (not files or len(files) <= 1):
        with tempfile.TemporaryDirectory() as td:
            script_path = os.path.join(td, 'main.py')
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(code)
            try:
                res = subprocess.run(
                    [sys.executable, script_path],
                    input=stdin or '',
                    capture_output=True, text=True, timeout=12
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
                    'memory': 'Server Turbo',
                    'engine': 'Server Turbo Python',
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
                    'stderr': 'Time Limit Exceeded: Execution took longer than 12 seconds.\nCheck for infinite loops or reduce input size.',
                    'compileOutput': '',
                    'time': f'{round(elapsed_sec * 1000)} ms',
                    'memory': 'Server Turbo',
                    'engine': 'Server Turbo Python',
                    'elapsedMs': round(elapsed_sec * 1000)
                }
            except Exception:
                pass

    # 2. OneCompiler Turbo Engine
    oc_result = execute_onecompiler(lang, code, stdin, files)
    if oc_result and oc_result.get('supported'):
        return oc_result

    # 3. Wandbox Fallback
    wb_result = execute_wandbox(lang, code, stdin)
    if wb_result and wb_result.get('supported'):
        return wb_result

    return {'supported': False, 'reason': 'No execution engine available for this language.'}


def execute_onecompiler(lang, code, stdin, files):
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

    payload = {
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
    }

    try:
        resp = http_requests.post(
            'https://onecompiler.com/api/code/exec',
            json=payload,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': f'https://onecompiler.com/{cfg["mode"]}',
                'Origin': 'https://onecompiler.com'
            },
            timeout=15
        )
        data = resp.json()
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


def execute_wandbox(lang, code, stdin):
    compiler_name = WANDBOX_MAP.get(lang)
    if not compiler_name:
        return None

    t0 = time.perf_counter()
    try:
        resp = http_requests.post(
            'https://wandbox.org/api/compile.json',
            json={'compiler': compiler_name, 'code': code, 'stdin': stdin or ''},
            headers={'User-Agent': 'Mozilla/5.0'},
            timeout=15
        )
        wb_res = resp.json()
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


# ── Main Entry Point ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f"🚀 CompilerG running on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
