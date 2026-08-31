import os
import sys
import subprocess
import shutil
import threading
import signal
import time

def print_header(title):
    print("=" * 60)
    print(f" {title:^58} ")
    print("=" * 60)

def detect_os():
    if os.name == 'nt':
        return 'windows'
    elif sys.platform.startswith('linux'):
        return 'linux'
    else:
        return 'other'

def check_wkhtmltopdf(os_type):
    print("[*] Checking wkhtmltopdf installation...")
    
    # 1. Check if in system PATH
    path_executable = shutil.which("wkhtmltopdf")
    if path_executable:
        print(f"  [+] Found wkhtmltopdf in PATH: {path_executable}")
        return True

    # 2. Check standard Windows paths
    if os_type == 'windows':
        standard_paths = [
            r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
            r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        ]
        for path in standard_paths:
            if os.path.exists(path):
                print(f"  [+] Found wkhtmltopdf at standard Windows path: {path}")
                return True
        
        print("  [!] WARNING: wkhtmltopdf was not found on your system!")
        print("  To enable PDF generation, please download and install wkhtmltopdf from:")
        print("  https://wkhtmltopdf.org/downloads.html")
        print("  After installing, please restart this script.")
        return False
    else:
        # Linux / other
        print("  [!] WARNING: wkhtmltopdf was not found in your PATH!")
        print("  To enable PDF generation, please install it via your package manager:")
        print("  - For Debian/Ubuntu (with patched Qt):")
        print("    wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb")
        print("    sudo apt install ./wkhtmltox_0.12.6.1-3.bookworm_amd64.deb")
        print("  After installing, please restart this script.")
        return False

def setup_python_venv(os_type):
    print_header("Backend Environment Setup (FastAPI)")
    backend_dir = os.path.join(os.getcwd(), "fast_api")
    venv_dir = os.path.join(backend_dir, ".venv")
    
    if os_type == 'windows':
        python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
        pip_exe = os.path.join(venv_dir, "Scripts", "pip.exe")
    else:
        python_exe = os.path.join(venv_dir, "bin", "python")
        pip_exe = os.path.join(venv_dir, "bin", "pip")

    # Create venv if not exists
    if not os.path.exists(venv_dir):
        print(f"[*] Creating Python virtual environment in {venv_dir}...")
        try:
            subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
            print("  [+] Virtual environment created successfully.")
        except Exception as e:
            print(f"  [-] Failed to create virtual environment: {e}")
            sys.exit(1)
    else:
        print("[+] Python virtual environment already exists.")

    # Install requirements
    requirements_path = os.path.join(os.getcwd(), "requirements.txt")
    if os.path.exists(requirements_path):
        print("[*] Installing/updating backend dependencies...")
        try:
            subprocess.run([pip_exe, "install", "-r", requirements_path], check=True)
            print("  [+] Dependencies installed successfully.")
        except Exception as e:
            print(f"  [-] Failed to install dependencies: {e}")
            sys.exit(1)
    else:
        print(f"  [!] requirements.txt not found at {requirements_path}")

    return python_exe

def setup_node_modules():
    print_header("Frontend Environment Setup (Next.js)")
    node_modules_dir = os.path.join(os.getcwd(), "node_modules")
    
    if not os.path.exists(node_modules_dir):
        print("[*] Installing frontend dependencies (npm install)...")
        try:
            # Check if npm is available
            npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
            subprocess.run([npm_cmd, "install"], check=True)
            print("  [+] Frontend dependencies installed successfully.")
        except Exception as e:
            print(f"  [-] Failed to run npm install: {e}")
            sys.exit(1)
    else:
        print("[+] Frontend dependencies (node_modules) already installed.")

def run_process_and_forward(cmd, cwd, name, color_code):
    # Set environment variables if needed
    env = os.environ.copy()
    
    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
        shell=(os.name == 'nt')
    )
    
    def log_output():
        for line in iter(process.stdout.readline, ''):
            # Print with prefix and color if supported
            print(f"\033[{color_code}m[{name}]\033[0m {line.strip()}")
        process.stdout.close()

    thread = threading.Thread(target=log_output, daemon=True)
    thread.start()
    return process

def main():
    os_type = detect_os()
    print_header(f"AWO Generator Runner - OS detected: {os_type.upper()}")
    
    # Check wkhtmltopdf
    check_wkhtmltopdf(os_type)
    
    # Set up Backend and Frontend
    python_exe = setup_python_venv(os_type)
    setup_node_modules()
    
    print_header("Starting Services")
    print("[*] Launching Backend and Frontend in parallel...")
    
    processes = []
    
    # 1. Start backend (FastAPI)
    backend_cwd = os.path.join(os.getcwd(), "fast_api")
    # We call main.py directly or uvicorn
    backend_cmd = [python_exe, "main.py"]
    print(f"  -> Starting FastAPI Backend: {' '.join(backend_cmd)}")
    # 32 is Green
    backend_process = run_process_and_forward(backend_cmd, backend_cwd, "Backend", "32")
    processes.append(backend_process)
    
    # Give the backend a quick second to bind to port 8000
    time.sleep(1)
    
    # 2. Start frontend (Next.js)
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    print(f"  -> Starting Next.js Frontend: {' '.join(frontend_cmd)}")
    # 36 is Cyan
    frontend_process = run_process_and_forward(frontend_cmd, os.getcwd(), "Frontend", "36")
    processes.append(frontend_process)
    
    print("\n[+] Both services are running!")
    print("    - Frontend: http://localhost:3000")
    print("    - Backend:  http://localhost:8000")
    print("[*] Press Ctrl+C to stop both services.\n")
    
    # Handle graceful exit
    def signal_handler(sig, frame):
        print("\n[*] Stopping services gracefully...")
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=2)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print("[+] Both services stopped. Exiting.")
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    
    # Keep the main thread alive and monitor processes
    while True:
        try:
            time.sleep(1)
            # Check if any process died
            for p in processes:
                if p.poll() is not None:
                    print(f"\n[!] Process {p.args} exited unexpectedly with code {p.returncode}.")
                    signal_handler(None, None)
        except (KeyboardInterrupt, SystemExit):
            signal_handler(None, None)

if __name__ == "__main__":
    # Enable colors on Windows if possible
    if os.name == 'nt':
        os.system('color')
    main()
