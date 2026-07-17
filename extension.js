const vscode = require('vscode');
const path = require('path');
const { startServer: startLiteHttpServer } = require('./server');

let httpServer = null;
let serverPort = 8080;
let statusBarItem = null;

function activate(context) {
  // 初始化状态栏
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'lite-http-preview.stopServer';
  context.subscriptions.push(statusBarItem);

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('lite-http-preview.startServer', startServer),
    vscode.commands.registerCommand('lite-http-preview.stopServer', stopServer),
    vscode.commands.registerCommand('lite-http-preview.previewFile', previewFile)
  );
}

function deactivate() {
  stopServer();
}

/**
 * 启动内嵌 HTTP 预览服务
 */
function startServer(rootDir) {
  return new Promise(async (resolve, reject) => {
    if (httpServer) {
      resolve(serverPort);
      return;
    }

    const config = vscode.workspace.getConfiguration('lite-http-preview');
    serverPort = config.get('port') || 8080;
    const cwd = rootDir || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath) || process.cwd();

    try {
      const result = await startLiteHttpServer(cwd, serverPort, true);
      httpServer = result.server;
      serverPort = result.port;
      updateStatusBar(true);
      vscode.window.showInformationMessage(`Lite HTTP Preview 预览服务已启动，端口: ${serverPort}`);
      resolve(serverPort);
    } catch (err) {
      httpServer = null;
      updateStatusBar(false);
      vscode.window.showErrorMessage(`Lite HTTP Preview 启动失败: ${err.message}`);
      reject(err);
    }
  });
}

/**
 * 停止服务器
 */
function stopServer() {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
    updateStatusBar(false);
    vscode.window.showInformationMessage('Lite HTTP Preview 预览服务已停止');
  }
}

/**
 * 预览文件/目录
 */
async function previewFile(uri) {
  if (!uri || !uri.fsPath) {
    vscode.window.showWarningMessage('请在资源管理器中右键选择要预览的文件');
    return;
  }

  const fsPath = uri.fsPath;
  const stat = require('fs').statSync(fsPath);
  
  // 始终以工作区根目录作为 server 根目录
  const rootDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || path.dirname(fsPath);
  
  // 计算相对路径
  const relativePath = stat.isDirectory() 
    ? '/' + path.relative(rootDir, fsPath).replace(/\\/g, '/') + '/'
    : '/' + path.relative(rootDir, fsPath).replace(/\\/g, '/');

  try {
    const port = await startServer(rootDir);
    const previewUrl = `http://localhost:${port}${encodeURI(relativePath)}`;
    vscode.env.openExternal(vscode.Uri.parse(previewUrl));
  } catch (err) {
    vscode.window.showErrorMessage(`预览失败: ${err.message}`);
  }
}

/**
 * 更新状态栏
 */
function updateStatusBar(running) {
  if (running) {
    statusBarItem.text = `$(globe) Lite HTTP :${serverPort}`;
    statusBarItem.tooltip = '点击停止 Lite HTTP Preview 预览服务';
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

module.exports = { activate, deactivate };
