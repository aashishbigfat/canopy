import py7zr
import os

zip_path = r'D:\Tutterfly-main.7z'
extract_path = r'd:\manager_code'

print(f"Extracting {zip_path} to {extract_path}...")

os.makedirs(extract_path, exist_ok=True)

try:
    with py7zr.SevenZipFile(zip_path, mode='r') as z:
        z.extractall(path=extract_path)
    print("Extraction successful.")
except Exception as e:
    print(f"Failed to extract: {e}")
