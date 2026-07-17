# AGENTS.md — VS Code 插件项目导航

> 本文档面向 AI Coding Agent。读者应被假设为对项目一无所知。
> 项目语言：中文（注释、文档、UI 文案均为中文）。

---

## 项目概述

**Lite HTTP Preview** 是一个 VS Code 插件，提供轻量级本地文件预览服务。核心能力包括：

- 📁 **目录浏览** — 自动列出目录内容，支持多级导航
- 📝 **Markdown 渲染** — 基于 `markdown-it` + `highlight.js` 在浏览器中预览 Markdown
- 📥 **文件下载** — Markdown 文件支持下载原始 `.md`
- 🔒 **安全访问** — 隐藏文件（`.` 开头）自动过滤，防止目录遍历攻击
- 🚀 **零配置** — 内置 HTTP 服务器，无需额外安装依赖

插件在 VS Code 中注册 3 条命令和 1 个状态栏项，用户可通过右键菜单、命令面板或状态栏交互。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行环境 | Node.js（VS Code 内置） |
| 插件框架 | VS Code Extension API (`vscode`) |
| HTTP 服务器 | Node.js 原生 `http` 模块 |
| Markdown 渲染 | `markdown-it` (browser) + `highlight.js` (browser) |
| 前端样式 | 纯 CSS（GitHub 风格），无外部 UI 框架 |
| 开发依赖 | `eslint@^8`、 `@types/vscode@^1.60.0`、 `@types/node@^16` |

---

## 项目结构

```
vscode-lite-http-preview/
├── extension.js          # 插件入口：命令注册、生命周期、状态栏管理
├── package.json          # VS Code 插件清单（命令、菜单、配置点）
├── server/
│   ├── index.js          # HTTP 服务器核心：路由、安全校验、模板渲染
│   ├── templates/
│   │   ├── directory.html    # 目录列表页 HTML 模板
│   │   └── markdown.html     # Markdown 预览页 HTML 模板
│   └── vendor/
│       ├── markdown-it.min.js   # Markdown 解析器（浏览器端）
│       ├── highlight.min.js     # 代码高亮（浏览器端）
│       ├── github.min.css       # GitHub 风格高亮主题
│       └── marked.min.js        # 备用 Markdown 解析器（当前未使用）
├── README.md
├── .gitignore
└── .vscodeignore
```

### 关键文件职责

- **`extension.js`** — 实现 `activate` / `deactivate`；注册 3 条命令；维护 `httpServer` 和 `statusBarItem` 单例状态。
- **`server/index.js`** — 导出 `startServer(rootDir, port, listMode)` 和 `createServer(rootDir, listMode)`。负责端口递增重试、目录遍历防护、隐藏文件过滤、MIME 映射、Markdown 预览/下载双模式。
- **`server/templates/*.html`** — 纯 HTML 模板，使用简单的字符串替换（`{{placeholder}}`）注入动态内容。
- **`server/vendor/`** — 浏览器端静态依赖，通过 `/vendor/*` 路由由服务器直接提供。

---

## 运行时架构

```
[VS Code 窗口]
   │
   ▼
extension.js ──► server/index.js (createServer)
                      │
                      ├── 普通文件请求 ──► rootDir (用户工作区)
                      ├── Markdown 请求 ──► 渲染为 HTML 返回
                      ├── 目录请求 ──► 渲染 directory.html
                      └── /vendor/* ──► server/vendor/ (插件自带)
```

- 服务器根目录默认取当前工作区根目录（`workspaceFolders[0]`）。
- 端口默认 `8080`，可在 VS Code 设置项 `lite-http-preview.port` 修改。
- 若端口被占用，自动尝试 `port + 1`，最多重试 5 次。
- 状态栏显示当前端口，点击可停止服务。

---

## 命令与配置

### 注册的命令（`package.json` + `extension.js`）

| 命令 ID | 标题 | 行为 |
|---------|------|------|
| `lite-http-preview.startServer` | Lite HTTP Preview: 启动预览服务 | 启动 HTTP 服务 |
| `lite-http-preview.stopServer` | Lite HTTP Preview: 停止预览服务 | 关闭 HTTP 服务 |
| `lite-http-preview.previewFile` | Lite HTTP Preview: 在浏览器中预览 | 启动服务（如未启动）并在系统浏览器打开文件/目录 |

### 右键菜单

- 出现在资源管理器上下文菜单（`explorer/context`）
- 仅当 `resourceScheme == file` 时显示
- 分组：`navigation@1`

### 配置项

```json
{
  "lite-http-preview.port": 8080
}
```

---

## 安全设计

1. **目录遍历防护** — 所有请求路径通过 `path.resolve()` 校验，必须落在 `resolvedRoot` 前缀内，否则返回 `403 Forbidden`。
2. **隐藏文件过滤** — URL 路径中任何段以 `.` 开头均返回 `404 Not Found`（避免暴露存在性）。
3. **无上传/写接口** — 服务器只读，仅提供文件浏览和下载。

---

## 构建与测试命令

项目使用 `npm` 作为包管理器，脚本定义在 `package.json`：

```bash
# 代码检查
npm run lint

# 运行测试（先自动执行 lint）
npm test
```

> ⚠️ 注意：当前仓库中 **没有 `test/` 目录**，`npm test` 会失败。如需添加测试，需先创建 `test/runTest.js` 及相关测试文件。

---

## 代码风格指南

- 使用 **CommonJS** (`require` / `module.exports`)，非 ESM。
- 变量命名：驼峰式（`serverPort`、`httpServer`）。
- 注释以中文书写，说明函数用途和关键逻辑。
- 字符串使用单引号为主（与现有代码保持一致）。
- 缩进：2 个空格。
- 模板字符串使用简单的 `String.prototype.replace` 进行占位符替换，未引入模板引擎。

---

## 测试策略

当前状态：**无测试代码**。建议补充的测试方向：

1. **单元测试** — `server/index.js` 中 `createServer` 的各路由分支（文件、目录、Markdown、vendor、404、403）。
2. **端口重试逻辑** — 验证端口被占用时自动递增行为。
3. **安全测试** — 目录遍历攻击（`../`）、隐藏文件访问（`.git`）应被拦截。
4. **集成测试** — 使用 VS Code 测试框架 (`@vscode/test-electron`) 模拟命令调用和状态栏更新。

---

## 打包与发布

- 使用 `vsce`（VS Code Extension CLI）打包为 `.vsix`：
  ```bash
  npx @vscode/vsce package
  ```
- `.vscodeignore` 已排除开发文件（`.vscode/`、`node_modules/`、`.gitignore`、source maps、TypeScript 文件等）。
- `server/vendor/` 中的第三方库（`markdown-it`、`highlight.js`）会随插件一起打包，无需用户额外安装。

---

## 开发注意事项

- **不要删除 `server/vendor/` 中的文件** — 它们是浏览器端渲染的必需依赖。
- **修改模板后需重启插件** — 模板在 `createServer` 启动时通过 `fs.readFileSync` 一次性读入内存，非热更新。
- **端口配置即时生效** — 每次 `startServer` 都会重新读取 `vscode.workspace.getConfiguration('lite-http-preview')`。
- **Markdown 渲染在浏览器端完成** — 服务器仅将原始 Markdown 文本 JSON 序列化后注入模板，由 `markdown-it.min.js` 在客户端解析，减轻服务器负担。

---

## 相关文档

- `README.md` — 面向最终用户的功能说明和使用指南（中文）。
- `package.json` — 插件清单、命令、菜单、配置、依赖的权威来源。
