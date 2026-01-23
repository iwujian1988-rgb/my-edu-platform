@echo off
ssh root@43.99.58.240 "cd /root/my-edu-platform && git pull && npm run build && pm2 restart my-edu-platform"
pause
