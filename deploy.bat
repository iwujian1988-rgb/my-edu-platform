@echo off
cd /d "%~dp0"
git branch --show-current | findstr /x "master" >nul
if errorlevel 1 (
  echo Deployment must run from the master branch.
  goto failed
)
echo This deploys committed code. Uncommitted edits stay local.
echo ========================================
echo 1. Syncing GitHub and pushing committed code...
git fetch origin master
if errorlevel 1 goto failed
git merge --ff-only origin/master
if errorlevel 1 goto failed
git push origin master
if errorlevel 1 goto failed

echo ========================================
echo 2. Deploying to server...
ssh -o BatchMode=yes -o ConnectTimeout=20 root@43.99.58.240 "cd /root/my-edu-platform && python3 scripts/server-release.py --pull --deploy"
if errorlevel 1 goto failed

echo ========================================
echo 3. Deployment completed!
if /I not "%~1"=="--non-interactive" pause
exit /b 0

:failed
echo Deployment failed. Check the error above; deployment is not confirmed.
if /I not "%~1"=="--non-interactive" pause
exit /b 1
