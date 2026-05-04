import os
import shutil

src = r'd:\manager_code\Tutterfly-main'
dst = r'd:\tutterfly'

ignore_dirs = {'.next', 'node_modules', '__pycache__', '.venv', '.git', '.omc'}

for root, dirs, files in os.walk(src):
    # Filter ignored directories
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    
    for file in files:
        src_path = os.path.join(root, file)
        rel_path = os.path.relpath(src_path, src)
        dst_path = os.path.join(dst, rel_path)
        
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        try:
            shutil.copy2(src_path, dst_path)
        except Exception as e:
            print(f"Skipping {rel_path} due to error: {e}")

print("Copy completed successfully.")
