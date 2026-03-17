@echo off
chcp 65001 >nul
title AI Example Generator

echo ============================================
echo   AI Example Sentence Generator
echo   Auto Resume Enabled
echo   Press Ctrl+C to stop, run again to resume
echo ============================================
echo.

cd /d D:\claude_work\yingyu\my-edu-platform
set PYTHONIOENCODING=utf-8

python scripts/generate_examples_v3_parallel.py --all --workers 10

echo.
echo ============================================
echo   Done!
echo ============================================
pause
