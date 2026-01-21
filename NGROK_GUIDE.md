# ngrok 免费内网穿透工具

## 安装
1. 访问 https://ngrok.com/download
2. 下载 Windows 版本
3. 解压到某个目录（如 C:\ngrok）

## 使用
1. 打开命令行，进入 ngrok 目录
   ```bash
   cd C:\ngrok
   ```

2. 运行 ngrok（映射 3000 端口）
   ```bash
   ngrok http 3000
   ```

3. 控制台会显示：
   ```
   Forwarding  https://xxxx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
   ```

4. 把 https://xxxx-xx-xx-xx.ngrok-free.app 这个地址发给同事

## 注意
- 免费版每次重启地址会变
- 免费版有连接数限制（够测试用）
- 需要保持 ngrok 窗口开启
