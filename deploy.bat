@echo off
set "msg=Auto deploy update"
if not "%~1"=="" set "msg=%~1"

echo =======================================
echo [1/3] Staging all changes...
git add .

echo.
echo [2/3] Committing changes with message: "%msg%"
git commit -m "%msg%"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo =======================================
echo Deploy complete! Render and Vercel will rebuild now.
pause
