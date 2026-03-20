@echo off
echo ========================================
echo 1. Pushing to GitHub...
git push

echo ========================================
echo 2. Deploying to server...
ssh root@43.99.58.240 "cd /root/my-edu-platform && git fetch origin && git reset --hard origin/master && rm -rf .next && npm run build && pm2 restart my-edu-platform"

echo ========================================
echo 3. Deployment completed!
pause
