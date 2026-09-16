@echo off
title FoodSave Server (Port 3000)
cd /d "%~dp0"
echo.
echo ==========================================================
echo   🌿 FoodSave Server - http://localhost:3000
echo   Connected to Cloud Database (Supabase PostgreSQL)
echo   Keep this window open while using the web app.
echo ==========================================================
echo.
node src/server.js
echo.
echo Server stopped.
pause
