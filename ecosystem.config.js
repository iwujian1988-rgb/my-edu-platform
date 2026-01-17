/**
 * PM2 配置文件 - 2GB内存优化版 ✅
 * 适用于：2 vCPU + 2GB 内存
 * 优势：内存翻倍，可以运行2个实例（高可用）
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'my-edu-platform',

      // 启动脚本
      script: 'npm',
      args: 'start',

      // ✅ 2GB内存可以支持2个实例（高可用）
      instances: 2,
      exec_mode: 'cluster',

      // ✅ 内存监控阈值（提高到900MB）
      // 原因：2GB总内存，系统需要400MB，每个实例可以用900MB
      max_memory_restart: '900M',

      // 最小运行时间
      min_uptime: '60s',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // ✅ 提高堆内存限制到1GB
        NODE_OPTIONS: '--max-old-space-size=1024'
      },

      // 日志配置
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 日志轮转
      log_file_size: '10M',
      log_file_count: 5,

      // 进程管理
      max_restarts: 10,
      restart_delay: 5000,

      // 优雅关闭
      kill_timeout: 8000,
      wait_ready: true,
      autorestart: true,

      // 监听端口
      listen_timeout: 10000,

      // 端口配置
      port: 3000,

      // 其他配置
      merge_logs: true,
      combine_logs: true,

      // 优雅重启策略
      exp_backoff_restart_delay: 100,
    }
  ]
}
