@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "CLINK_WALLET_INIT_ENVIRONMENT=sandbox"

set "NODE_EXE="
if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE if defined VoltaHome if exist "%VoltaHome%\bin\node.exe" set "NODE_EXE=%VoltaHome%\bin\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\scoop\apps\nodejs\current\node.exe" set "NODE_EXE=%USERPROFILE%\scoop\apps\nodejs\current\node.exe"

set "WINDOWS_DIR=%SystemRoot%"
if not defined WINDOWS_DIR set "WINDOWS_DIR=%WINDIR%"
if not defined NODE_EXE if defined WINDOWS_DIR if exist "%WINDOWS_DIR%\System32\where.exe" for /f "usebackq delims=" %%N in (`"%WINDOWS_DIR%\System32\where.exe" node.exe 2^>nul`) do if not defined NODE_EXE set "NODE_EXE=%%N"

if not defined NODE_EXE (
  >&2 echo Node.js 20 or newer was not found in PATH or a standard Windows installation directory.
  exit /b 9009
)

"%NODE_EXE%" "%SCRIPT_DIR%..\vendor\visa-cli\visa-cli.bundle.mjs" %*
exit /b %ERRORLEVEL%
