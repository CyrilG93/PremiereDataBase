@echo off
REM Installation script for Data Base extension - Windows

set EXTENSION_NAME=com.database.premiere
set SOURCE_DIR=%~dp0

REM CEP Extensions directory
set CEP_DIR=%APPDATA%\Adobe\CEP\extensions

REM Create extensions directory if it doesn't exist
if not exist "%CEP_DIR%" mkdir "%CEP_DIR%"

REM Remove existing installation
if exist "%CEP_DIR%\%EXTENSION_NAME%" rmdir /s /q "%CEP_DIR%\%EXTENSION_NAME%"

REM Create symbolic link (requires admin privileges)
mklink /D "%CEP_DIR%\%EXTENSION_NAME%" "%SOURCE_DIR%"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to create symbolic link.
    echo Please run this script as Administrator.
    echo.
    pause
    exit /b 1
)

echo.
echo Data Base extension installed successfully!
echo.
echo Location: %CEP_DIR%\%EXTENSION_NAME%
echo.
echo If the extension doesn't appear in Premiere Pro:
echo   1. Enable unsigned extensions by adding this registry key:
echo      HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11
echo      Name: PlayerDebugMode  Type: String  Value: 1
echo   2. Restart Premiere Pro
echo.
echo Access via: Window - Extensions - Data Base
echo.
pause
