# Running the backend

The backend must be run **from this directory** (`tutterfly-python/tutterfly-python`) so Python can find the `app` module.

**Why:** `uvicorn app.main:app` loads the module `app.main`. Python looks for the `app` package in the current working directory. If you run uvicorn from the repo root or from `tutterfly-python`, there is no `app` folder there → `ModuleNotFoundError: No module named 'app'`.

## Option 1: PowerShell (from this folder)

```powershell
cd d:\tutterfly-nextjs\tutterfly-python\tutterfly-python
.\run.ps1
```

Or from repo root:

```powershell
.\tutterfly-python\tutterfly-python\run.ps1
```

## Option 2: Manual (from this folder)

```powershell
cd d:\tutterfly-nextjs\tutterfly-python\tutterfly-python
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Option 3: From any folder (set PYTHONPATH)

```powershell
cd d:\tutterfly-nextjs\tutterfly-python\tutterfly-python
$env:PYTHONPATH = (Get-Location).Path
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open: http://localhost:8000/api/docs
