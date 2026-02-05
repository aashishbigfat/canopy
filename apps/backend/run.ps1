# Run FastAPI backend from this directory so Python finds the 'app' module.
# Usage: from repo root, run: .\tutterfly-python\tutterfly-python\run.ps1
# Or cd here first: cd tutterfly-python\tutterfly-python then .\run.ps1

Set-Location $PSScriptRoot
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
