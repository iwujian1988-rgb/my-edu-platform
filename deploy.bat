@echo off
echo ========================================
echo 1. Pushing to GitHub...
git push

echo ========================================
echo 2. Pulling on server and rebuilding...
ssh root@43.99.58.240 "cd /root/my-edu-platform && git pull && rm -rf .next && npm run build && pm2 restart my-edu-platform"

echo ========================================
echo 3. Deployment completed!
pause
