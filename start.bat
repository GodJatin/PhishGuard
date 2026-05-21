@echo off
title PhishGuard Monorepo Launcher

echo ==========================================
echo Starting PhishGuard Services...
echo ==========================================

:: Start the backend service in a new cmd window
echo [1/2] Starting Backend (FastAPI)...
start "PhishGuard Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate && python run.py"

:: Start the frontend service in a new cmd window
echo [2/2] Starting Frontend (Next.js)...
start "PhishGuard Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo ==========================================
echo Both services are starting in separate windows.
echo - Backend will be available at: http://localhost:8000
echo - Frontend will be available at: http://localhost:3000
echo ==========================================
pause
