@echo off
rem Opens the offline build next to this script. Run "npm run build" first.
if not exist "%~dp0dist\*.html" (echo dist\ not found. Run: npm install ^&^& npm run build & pause & exit /b 1)
for %%F in ("%~dp0dist\*.html") do start "" "%%~fF"
