@echo off
cd /d "%~dp0"
start "" http://localhost:3000/login.html
npm.cmd run dev
pause
