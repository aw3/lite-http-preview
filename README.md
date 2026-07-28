# Lite HTTP Preview - VS Code Extension

A lightweight local file preview server with Markdown rendering, directory browsing, and file download.

轻量级本地文件预览服务，支持 Markdown 渲染、目录浏览和文件下载。

## Features / 功能特性

- 📁 **Directory Browsing / 目录浏览** - Automatically lists directory contents with multi-level navigation / 自动列出目录内容，支持多级导航
- 📝 **Markdown Preview / Markdown 预览** - Renders Markdown files with syntax highlighting / 自动渲染 Markdown 文件，支持代码高亮
- 📥 **File Download / 文件下载** - Download any file directly from the browser / 所有文件支持直接下载
- 🔒 **Secure Access / 安全访问** - Hidden files (starting with `.`) are filtered; path traversal is blocked / 隐藏文件（.开头）自动过滤，防止目录遍历
- 🚀 **Zero Configuration / 零配置** - Built-in HTTP server, works out of the box / 内置 HTTP 服务器，开箱即用

## Usage / 使用方法

### 1. Right-click Preview / 右键预览

Right-click a file or directory in the Explorer, then choose **"Lite HTTP Preview: 在浏览器中预览"**.

在资源管理器中右键点击文件或目录，选择 **"Lite HTTP Preview: 在浏览器中预览"**。

### 2. Command Palette / 命令面板

- Press `Ctrl+Shift+P` to open the Command Palette / 按 `Ctrl+Shift+P` 打开命令面板
- Run `Lite HTTP Preview: 启动预览服务` to start the server / 启动服务
- Run `Lite HTTP Preview: 停止预览服务` to stop the server / 停止服务

### 3. Status Bar / 状态栏

After the server starts, the status bar shows the current port. Click it to stop the server.

启动服务后，状态栏会显示当前端口号，点击可停止服务。

## Configuration / 配置选项

Available in VS Code settings / 在 VS Code 设置中可以配置：

```json
{
  "lite-http-preview.port": 8080
}
```

## Implementation / 技术实现

- Built-in HTTP server, no global installation required / 内置 HTTP 服务器，无需全局安装
- Markdown rendered with markdown-it + highlight.js / 使用 markdown-it + highlight.js 渲染 Markdown
- Automatic port increment when the port is occupied / 支持端口自动递增（当端口被占用时）
- Hidden file filtering for security / 隐藏文件安全过滤

## License

MIT
