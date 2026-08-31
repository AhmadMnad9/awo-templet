import os
import sys
import subprocess
import shutil

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

def setup_node_modules():
    print_header("Environment Setup (Next.js)")
    node_modules_dir = os.path.join(os.getcwd(), "node_modules")
    
    if not os.path.exists(node_modules_dir):
        print("[*] Installing project dependencies (npm install)...")
        try:
            npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
            subprocess.run([npm_cmd, "install"], check=True)
            print("  [+] Dependencies installed successfully.")
        except Exception as e:
            print(f"  [-] Failed to run npm install: {e}")
            sys.exit(1)
    else:
        print("[+] Dependencies (node_modules) already installed.")

def main():
    os_type = detect_os()
    print_header(f"AWO Generator Runner - OS detected: {os_type.upper()}")
    
    # Set up Frontend
    setup_node_modules()
    
    print_header("Starting Services")
    print("[*] Launching AWO Generator (Next.js)...")
    
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    
    print(f"  -> Starting Dev Server: {' '.join(frontend_cmd)}")
    print("\n[+] Service is running!")
    print("    - URL: http://localhost:3000")
    print("[*] Press Ctrl+C to stop.\n")
    
    try:
        # Run Next.js in the foreground directly to inherit console inputs/outputs
        subprocess.run(frontend_cmd, shell=(os.name == 'nt'))
    except KeyboardInterrupt:
        print("\n[*] Stopping services. Exiting.")
        sys.exit(0)

if __name__ == "__main__":
    if os.name == 'nt':
        os.system('color')
    main()
