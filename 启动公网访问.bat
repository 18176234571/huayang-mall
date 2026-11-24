@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   华阳自营商城 · 本机 + 公网访问
echo ============================================
echo [1/3] 启动商城服务（端口 8080）...
start "华阳商城-服务" cmd /c "node server.js"
timeout /t 3 >nul
echo [2/3] 打开本地预览...
start "" "http://localhost:8080/"
echo [3/3] 建立公网隧道，请在下方的输出中复制 trycloudflare.com 地址
echo --------------------------------------------
"%~dp0deploy\cloudflared.exe" tunnel --url http://localhost:8080 --no-autoupdate
pause
