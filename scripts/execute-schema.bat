@echo off
REM ============================================
REM Supabase Schema 执行脚本 (Windows)
REM ============================================
REM
REM 使用方法:
REM 1. 确保已安装 PostgreSQL 客户端工具
REM 2. 设置数据库密码
REM 3. 运行此脚本
REM

SET PROJECT_REF=snnrjnpcmdsdlyldvvps
SET DB_HOST=db.%PROJECT_REF%.supabase.co
SET DB_PORT=5432
SET DB_NAME=postgres
SET DB_USER=postgres

REM 提示用户输入数据库密码
echo ============================================
echo Supabase Schema 执行脚本
echo ============================================
echo.
echo 项目: %PROJECT_REF%
echo 数据库: %DB_HOST%
echo.
echo [注意] 请从 Supabase Dashboard 获取数据库密码
echo Dashboard: https://supabase.com/dashboard/project/%PROJECT_REF%/settings/database
echo.
set /p DB_PASSWORD="请输入数据库密码: "

REM 执行 schema
echo.
echo 正在执行 schema.sql...
echo.

psql "postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" -f supabase/schema.sql

REM 检查执行结果
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo ✅ Schema 执行成功！
    echo ============================================
    echo.
    echo 验证表创建:
    psql "postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    echo.
    echo 按任意键退出...
    pause > nul
) else (
    echo.
    echo ============================================
    echo ❌ 执行失败，请检查:
    echo ============================================
    echo.
    echo 1. 数据库密码是否正确
    echo 2. 网络连接是否正常
    echo 3. schema.sql 文件是否存在
    echo.
    echo 或者使用更简单的方法:
    echo https://supabase.com/dashboard/project/%PROJECT_REF%/sql/new
    echo.
    echo 按任意键退出...
    pause > nul
)
