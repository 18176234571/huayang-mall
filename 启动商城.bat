@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   华阳自营商城 · 平台启动
echo   前台 http://localhost:8080/
echo   后台 http://localhost:8080/admin
echo   账号 13800000000 / admin123
echo ============================================
start "" "http://localhost:8080/"
node server.js
pause
