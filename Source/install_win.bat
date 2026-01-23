@echo off
setlocal EnableDelayedExpansion

set "EXTENSION_NAME=com.database.premiere"
set "SOURCE_DIR=%~dp0"
set "CEP_DIR=%APPDATA%\Adobe\CEP\extensions"

echo ----------------------------------------------------
echo  Data Base Extension Installer (Windows)
echo ----------------------------------------------------

:: 1. Check/Install NPM
echo.
echo [1/4] Checking npm dependencies...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    Installing/Updating npm packages...
    call npm install --silent
) else (
    echo    WARNING: npm not found. Automatic dependency installation skipped.
    echo    Please ensure Node.js is installed if SpellBook is required.
)

:: 2. Create Directory
echo.
echo [2/4] Preparing destination...
if not exist "%CEP_DIR%" mkdir "%CEP_DIR%"
if exist "%CEP_DIR%\%EXTENSION_NAME%" (
    rmdir /s /q "%CEP_DIR%\%EXTENSION_NAME%"
)
mkdir "%CEP_DIR%\%EXTENSION_NAME%"

:: 3. Copy Files
echo.
echo [3/4] Copying files...
xcopy /E /I /Y "%SOURCE_DIR%CSXS" "%CEP_DIR%\%EXTENSION_NAME%\CSXS" >nul
xcopy /E /I /Y "%SOURCE_DIR%client" "%CEP_DIR%\%EXTENSION_NAME%\client" >nul
xcopy /E /I /Y "%SOURCE_DIR%host" "%CEP_DIR%\%EXTENSION_NAME%\host" >nul

:: Copy package.json
copy /Y "%SOURCE_DIR%package.json" "%CEP_DIR%\%EXTENSION_NAME%\" >nul

:: Copy node_modules if they exist
if exist "%SOURCE_DIR%node_modules" (
    echo    Copying node_modules...
    xcopy /E /I /Y "%SOURCE_DIR%node_modules" "%CEP_DIR%\%EXTENSION_NAME%\node_modules" >nul
)

:: Copy debug file
if exist "%SOURCE_DIR%.debug" (
    copy /Y "%SOURCE_DIR%.debug" "%CEP_DIR%\%EXTENSION_NAME%\" >nul
)

:: 4. Registry Hacks (PlayerDebugMode)
echo.
echo [4/4] Enabling PlayerDebugMode (Registry)...
echo    Setting CSXS 10-16 debug flags...

:: Try adding keys for multiple versions to be safe
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>nul

echo.
echo ----------------------------------------------------
echo  SUCCESS! Installation complete.
echo ----------------------------------------------------
echo  Location: %CEP_DIR%\%EXTENSION_NAME%
echo.
echo  1. Restart Premiere Pro.
echo  2. If the panel is blank, check localhost:8088 in Chrome.
echo.
pause
