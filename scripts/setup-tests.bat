@echo off
REM 自动化测试环境准备脚本 (Windows)
REM 用于快速准备测试环境和运行测试

echo ========================================
echo 自动化测试环境准备脚本
echo ========================================
echo.

REM 1. 检查 Node.js
echo [1/5] 检查 Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Node.js 未安装
    pause
    exit /b 1
)
node --version
echo [完成] Node.js 检查完成
echo.

REM 2. 检查 npm
echo [2/5] 检查 npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] npm 未安装
    pause
    exit /b 1
)
npm --version
echo [完成] npm 检查完成
echo.

REM 3. 安装依赖
echo [3/5] 安装项目依赖...
call npm install
echo [完成] 依赖安装完成
echo.

REM 4. 安装 Playwright 浏览器
echo [4/5] 安装 Playwright 浏览器...
call npx playwright install --with-deps
echo [完成] Playwright 浏览器安装完成
echo.

REM 5. 创建必要的目录
echo [5/5] 创建测试目录...
if not exist "test-results" mkdir test-results
if not exist "playwright-report" mkdir playwright-report
if not exist "screenshots" mkdir screenshots
if not exist "videos" mkdir videos
echo [完成] 目录创建完成
echo.

REM 6. 提示用户准备测试数据
echo ========================================
echo 下一步：准备测试数据
echo ========================================
echo.
echo 请按照以下步骤操作：
echo.
echo 1. 在 Supabase SQL Editor 中运行：
echo    supabase/migrations/999_test_data.sql
echo.
echo 2. 手动注册测试账号：
echo    访问 http://localhost:3000/login
echo    手机号: 13800138000
echo    密码: test123456
echo    邀请码: TEST1234
echo.
echo 3. 然后运行测试：
echo    npm test              - 运行所有测试
echo    npm run test:ui       - 交互式 UI 模式
echo    npm run test:headed   - 有头模式（可见浏览器）
echo.

REM 7. 询问是否立即运行测试
set /p RUN_TESTS="是否现在运行测试？(y/n): "
if /i "%RUN_TESTS%"=="y" (
    echo.
    echo 运行测试...
    call npm test
) else (
    echo.
    echo 测试环境准备完成！
    echo 稍后可以运行 'npm test' 开始测试
)

pause
