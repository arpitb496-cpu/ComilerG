import subprocess, sys, time, json, tempfile, os

def run_code(lang, code, stdin=''):
    t0 = time.perf_counter()
    with tempfile.TemporaryDirectory() as td:
        if lang == 'python':
            f = os.path.join(td, 'script.py')
            with open(f, 'w', encoding='utf-8') as fp:
                fp.write(code)
            cmd = [sys.executable, f]
        elif lang in ('javascript', 'js'):
            f = os.path.join(td, 'script.js')
            with open(f, 'w', encoding='utf-8') as fp:
                fp.write(code)
            node_path = r'C:\Program Files\nodejs\node.exe' if os.path.exists(r'C:\Program Files\nodejs\node.exe') else 'node'
            cmd = [node_path, f]
        else:
            return {'supported': False}

        try:
            res = subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=7)
            elapsed = time.perf_counter() - t0
            return {
                'supported': True,
                'isSuccess': res.returncode == 0,
                'statusCode': 3 if res.returncode == 0 else 11,
                'statusDescription': 'Accepted' if res.returncode == 0 else 'Runtime Error',
                'stdout': res.stdout,
                'stderr': res.stderr,
                'time': f'{elapsed:.2f}s',
                'memory': 'Local Turbo',
                'engine': 'Local Turbo Runner'
            }
        except subprocess.TimeoutExpired:
            return {
                'supported': True,
                'isSuccess': False,
                'statusCode': 5,
                'statusDescription': 'Time Limit Exceeded (7s)',
                'stdout': '',
                'stderr': 'Execution timed out after 7 seconds.',
                'time': '7.00s',
                'memory': 'Local Turbo',
                'engine': 'Local Turbo Runner'
            }

if __name__ == '__main__':
    print('Python:', run_code('python', 'print("Speed test: " + str(100*100))'))
    print('Node:', run_code('javascript', 'console.log("Node turbo speed: " + (50+50))'))
