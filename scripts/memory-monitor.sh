#!/bin/bash
# ========================================
# 内存监控脚本
# 每 5 分钟记录一次内存使用情况
# 保存历史数据，生成告警
# ========================================

# 配置
MONITOR_DIR="$HOME/memory-monitor"
LOG_DIR="$MONITOR_DIR/logs"
ALERT_DIR="$MONITOR_DIR/alerts"
REPORT_DIR="$MONITOR_DIR/reports"
INTERVAL=300  # 5 分钟

# 内存阈值（百分比）
MEMORY_WARN=70
MEMORY_ERROR=85
MEMORY_CRITICAL=95

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 创建目录
mkdir -p "$LOG_DIR" "$ALERT_DIR" "$REPORT_DIR"

# ===================== 函数定义 =====================

# 获取当前内存使用情况
get_memory_usage() {
    # 使用 free 命令获取内存信息
    local total=$(free -m | awk 'NR==2{print $2}')
    local used=$(free -m | awk 'NR==2{print $3}')
    local percent=$(awk "BEGIN{printf \"%.0f\", ($used/$total)*100}")

    echo "$total|$used|$percent"
}

# 获取应用内存使用（PM2）
get_app_memory() {
    if command -v pm2 &> /dev/null; then
        pm2 list | grep "my-edu-platform" | awk '{print $12}' | sed 's/MB//g'
    else
        echo "N/A"
    fi
}

# 记录日志
log_memory() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local mem_info=$(get_memory_usage)
    local app_mem=$(get_app_memory)

    local total=$(echo $mem_info | cut -d'|' -f1)
    local used=$(echo $mem_info | cut -d'|' -f2)
    local percent=$(echo $mem_info | cut -d'|' -f3)

    # 写入日志文件
    local log_file="$LOG_DIR/memory-$(date +%Y%m%d).log"
    echo "$timestamp|$total|$used|$percent|$app_mem" >> "$log_file"

    # 显示当前状态
    echo -n "$timestamp - 内存: ${used}MB/${total}MB (${percent}%)"
    if [ "$app_mem" != "N/A" ]; then
        echo " | 应用: ${app_mem}MB"
    else
        echo
    fi
}

# 检查并发送告警
check_alert() {
    local mem_info=$(get_memory_usage)
    local percent=$(echo $mem_info | cut -d'|' -f3)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # 警告告警
    if [ $percent -ge $MEMORY_WARN ]; then
        local alert_file="$ALERT_DIR/warning-$(date +%Y%m%d-%H%M%S).log"
        echo "$timestamp - 警告: 内存使用 ${percent}%" >> "$alert_file"
        echo -e "${YELLOW}⚠ 内存使用率: ${percent}%${NC}"
    fi

    # 错误告警
    if [ $percent -ge $MEMORY_ERROR ]; then
        local alert_file="$ALERT_DIR/error-$(date +%Y%m%d-%H%M%S).log"
        echo "$timestamp - 错误: 内存使用 ${percent}%" >> "$alert_file"
        echo -e "${RED}❌ 内存使用率过高: ${percent}%${NC}"

        # 发送通知（可选）
        # 可以在这里添加邮件或其他通知方式
    fi

    # 严重告警
    if [ $percent -ge $MEMORY_CRITICAL ]; then
        local alert_file="$ALERT_DIR/critical-$(date +%Y%m%d-%H%M%S).log"
        echo "$timestamp - 严重: 内存使用 ${percent}%" >> "$alert_file"
        echo -e "${RED}🚨 内存严重不足: ${percent}%${NC}"

        # 重启 PM2 进程（释放内存）
        echo "尝试重启 PM2 进程..."
        pm2 restart my-edu-platform
    fi
}

# 生成每日报告
generate_daily_report() {
    local date=$(date +%Y%m%d)
    local log_file="$LOG_DIR/memory-$date.log"
    local report_file="$REPORT_DIR/daily-$date.txt"

    if [ ! -f "$log_file" ]; then
        return
    fi

    echo "====================================" > "$report_file"
    echo "内存监控日报 - $(date +%Y-%m-%d)" >> "$report_file"
    echo "====================================" >> "$report_file"
    echo "" >> "$report_file"

    # 统计数据
    local total_lines=$(wc -l < "$log_file")
    local avg_percent=$(awk -F'|' '{sum+=$4} END {printf "%.1f", sum/NR}' "$log_file")
    local max_percent=$(awk -F'|' '{print $4}' "$log_file" | sort -rn | head -1)
    local min_percent=$(awk -F'|' '{print $4}' "$log_file" | sort -n | head -1)

    echo "采样次数: $total_lines" >> "$report_file"
    echo "平均使用: ${avg_percent}%" >> "$report_file"
    echo "最高使用: ${max_percent}%" >> "$report_file"
    echo "最低使用: ${min_percent}%" >> "$report_file"
    echo "" >> "$report_file"

    # 时间分布
    echo "每小时平均使用率:" >> "$report_file"
    awk -F'|' '{
        hour = substr($2, 12, 2)
        sum[hour] += $4
        count[hour]++
    }
    END {
        for (h in sum) {
            printf "  %s:00 - %.1f%%\n", h, sum[h]/count[h]
        }
    }' "$log_file" | sort >> "$report_file"

    echo "" >> "$report_file"
    echo "报告生成时间: $(date '+%Y-%m-%d %H:%M:%S')" >> "$report_file"

    echo "日报已生成: $report_file"
}

# ===================== 主程序 =====================

# 显示信息
echo "=========================================="
echo "  内存监控脚本"
echo "=========================================="
echo "监控目录: $MONITOR_DIR"
echo "检查间隔: $INTERVAL 秒"
echo "警告阈值: ${MEMORY_WARN}%"
echo "错误阈值: ${MEMORY_ERROR}%"
echo "严重阈值: ${MEMORY_CRITICAL}%"
echo "=========================================="
echo ""

# 如果是第一次运行，生成初始报告
if [ ! -f "$MONITOR_DIR/.initialized" ]; then
    echo "首次运行，创建监控目录..."
    touch "$MONITOR_DIR/.initialized"
    echo "完成！"
    echo ""
fi

# 主循环
echo "开始监控..."
echo "按 Ctrl+C 停止"
echo ""

while true; do
    # 记录日志
    log_memory

    # 检查告警
    check_alert

    # 每天凌晨生成日报
    current_hour=$(date +%H)
    current_minute=$(date +%M)
    if [ "$current_hour" = "00" ] && [ "$current_minute" = "00" ]; then
        generate_daily_report
    fi

    # 等待下次检查
    sleep $INTERVAL
done
