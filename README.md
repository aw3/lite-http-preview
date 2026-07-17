# Lite HTTP Preview - VS Code 插件

轻量级文件预览服务，支持 Markdown 渲染、目录浏览和文件下载。

## 功能特性

- 📁 **目录浏览** - 自动列出目录内容，支持多级导航
- 📝 **Markdown 预览** - 自动渲染 Markdown 文件，支持代码高亮
- 📥 **文件下载** - 所有文件支持直接下载
- 🔒 **安全访问** - 隐藏文件（.开头）自动过滤，防止目录遍历
- 🚀 **零配置** - 内置 HTTP 服务器，无需额外安装，开箱即用

## 使用方法

### 1. 右键预览
在资源管理器中右键点击文件或目录，选择 **"Lite HTTP Preview: 在浏览器中预览"**

### 2. 命令面板
- `Ctrl+Shift+P` 打开命令面板
- 输入 `Lite HTTP Preview: 启动预览服务` 启动服务
- 输入 `Lite HTTP Preview: 停止预览服务` 停止服务

### 3. 状态栏
启动服务后，状态栏会显示当前端口号，点击可停止服务。

## 配置选项

在 VS Code 设置中可以配置：

```json
{
  "lite-http-preview.port": 8080  // 预览服务端口号
}
```

## 技术实现

- 内置 HTTP 服务器，无需全局安装，插件自带完整服务能力
- 使用 markdown-it + highlight.js 渲染 Markdown
- 支持端口自动递增（当端口被占用时）
- 隐藏文件安全过滤

## License

MIT
