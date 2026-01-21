@echo off
echo 正在登录...
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"phone\":\"15652936305\",\"password\":\"wj5236016\"}" -o login_response.json

echo.
echo 正在读取token...
for /f "tokens=2 delims=:," %%a in ('type login_response.json ^| findstr token') do set TOKEN=%%a
echo Token: %TOKEN%

echo.
echo 正在创建学习数据...
curl -X POST http://localhost:3000/api/test/create-learning-data -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%"

echo.
echo 清理临时文件...
del login_response.json

pause
