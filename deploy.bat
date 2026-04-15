@echo off
cd /d "%~dp0"
echo === Notion ^> Git Sync ===
call npm run sync
if %ERRORLEVEL% neq 0 (
    echo.
    echo Sync failed with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)
echo.
pause