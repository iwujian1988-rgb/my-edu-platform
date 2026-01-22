/**
 * PM2 配置文件 - 4GB内存优化版 ✅
 * 适用于：2 vCPU + 4GB 内存
 * 优势：内存充足，稳定运行
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'my-edu-platform',

      // 启动脚本
      script: 'npm',
      args: 'start',

      // ✅ 单实例模式（稳定优先）
      // 4GB内存足够运行一个稳定实例
      instances: 1,
      exec_mode: 'fork',

      // ✅ 内存监控阈值（提高到1.5GB）
      // 4GB总内存，系统需要500MB，应用可以用1.5GB
      max_memory_restart: '1500M',

      // 最小运行时间
      min_uptime: '60s',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // ✅ 提高堆内存限制到1.5GB
        NODE_OPTIONS: '--max-old-space-size=1536'
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
