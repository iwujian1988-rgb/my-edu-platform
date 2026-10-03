@echo off
echo ========================================
echo 1. Pushing to GitHub...
git push
if errorlevel 1 goto failed

echo ========================================
echo 2. Deploying to server...
ssh -o BatchMode=yes -o ConnectTimeout=20 root@43.99.58.240 "cd /root/my-edu-platform && git diff --quiet && git diff --cached --quiet && git pull --ff-only origin master && npm run build && pm2 restart my-edu-platform && pm2 status"
if errorlevel 1 goto failed

echo ========================================
echo 3. Deployment completed!
if /I not "%~1"=="--non-interactive" pause
exit /b 0

:failed
echo Deployment failed. Check the error above; deployment is not confirmed.
if /I not "%~1"=="--non-interactive" pause
exit /b 1
