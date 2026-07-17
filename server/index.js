#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

// 读取模板文件
const templatesDir = path.join(__dirname, 'templates');
const markdownTemplate = fs.readFileSync(path.join(templatesDir, 'markdown.html'), 'utf-8');
const directoryTemplate = fs.readFileSync(path.join(templatesDir, 'directory.html'), 'utf-8');

// Markdown 预览 HTML 模板
function buildMarkdownPage(mdContent, fileName, vendorPath = '/vendor') {
  return markdownTemplate
    .replace(/\{\{fileName\}\}/g, fileName)
    .replace(/\{\{vendorPath\}\}/g, vendorPath)
    .replace(/\{\{mdContent\}\}/g, JSON.stringify(mdContent));
}

// 目录列表 HTML 模板
function buildDirectoryList(dirPath, files, currentUrl, vendorPath = '/vendor') {
  // 过滤隐藏文件（以 . 开头的文件和目录）
  const visibleFiles = files.filter(file => !file.name.startsWith('.'));
  
  const rows = visibleFiles.map(file => {
    const isDir = file.stats.isDirectory();
    const name = isDir ? file.name + '/' : file.name;
    const href = path.posix.join(currentUrl, file.name);
    const size = isDir ? '-' : formatSize(file.stats.size);
    const mtime = file.stats.mtime.toISOString().slice(0, 19).replace('T', ' ');
    const icon = isDir ? '📁' : getFileIcon(file.name);
    
    return `
      <tr>
        <td>${icon}</td>
        <td><a href="${href}">${name}</a></td>
        <td>${size}</td>
        <td>${mtime}</td>
      </tr>
    `;
  }).join('');

  // 返回上级目录链接
  const parentUrl = currentUrl === '/' ? '/' : path.posix.dirname(currentUrl);
  const parentLink = currentUrl === '/' ? '' : `
    <tr>
      <td>📂</td>
      <td><a href="${parentUrl}">..</a></td>
      <td>-</td>
      <td>-</td>
    </tr>
  `;

  return directoryTemplate
    .replace(/\{\{dirPath\}\}/g, dirPath)
    .replace(/\{\{vendorPath\}\}/g, vendorPath)
    .replace(/\{\{parentLink\}\}/g, parentLink)
    .replace(/\{\{rows\}\}/g, rows);
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 根据文件扩展名返回图标
function getFileIcon(filename) {
  const ext = path.extname(filename).toLowerCase();
  const icons = {
    '.md': '📝',
    '.js': '📜',
    '.json': '📋',
    '.html': '🌐',
    '.css': '🎨',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.gif': '🖼️',
    '.svg': '🖼️',
    '.txt': '📄',
    '.pdf': '📕',
    '.zip': '🗜️',
    '.rar': '🗜️',
  };
  return icons[ext] || '📄';
}

function createServer(rootDir, listMode = true) {
  const server = http.createServer((req, res) => {
    // 解析 URL
    const parsedUrl = url.parse(req.url, true);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    const query = parsedUrl.query;
    
    // 默认访问 index.html（非 list 模式下）
    if (pathname === '/' && !listMode) {
      pathname = '/index.html';
    }
    
    // 判断是否请求 vendor 资源（从包自身目录读取）
    const isVendorRequest = pathname.startsWith('/vendor/');
    let filePath;
    let resolvedRoot;
    
    if (isVendorRequest) {
      // vendor 资源从 lite-http-preview 包所在目录读取
      filePath = path.join(__dirname, pathname);
      resolvedRoot = path.resolve(__dirname);
    } else {
      // 普通资源从用户指定的根目录读取
      filePath = path.join(rootDir, pathname);
      resolvedRoot = path.resolve(rootDir);
    }
    
    // 安全检查：防止目录遍历攻击
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // 安全检查：禁止访问隐藏文件和目录（以 . 开头的），返回404以避免暴露其存在
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    if (pathParts.some(part => part.startsWith('.'))) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    
    // 读取文件
    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        } else if (err.code === 'EISDIR') {
          // 如果是目录
          if (listMode && !isVendorRequest) {
            // list 模式：显示目录文件列表
            fs.readdir(filePath, (err2, files) => {
              if (err2) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Internal Server Error');
                return;
              }
              
              // 获取文件详细信息
              const fileStats = files.map(name => {
                const fullPath = path.join(filePath, name);
                const stats = fs.statSync(fullPath);
                return { name, stats };
              });
              
              // 排序：目录在前，文件在后，各自按名称排序
              fileStats.sort((a, b) => {
                const aIsDir = a.stats.isDirectory() ? 0 : 1;
                const bIsDir = b.stats.isDirectory() ? 0 : 1;
                if (aIsDir !== bIsDir) return aIsDir - bIsDir;
                return a.name.localeCompare(b.name);
              });
              
              const relativePath = path.relative(rootDir, filePath);
              const displayPath = relativePath ? '/' + relativePath.replace(/\\/g, '/') + '/' : '/';
              const html = buildDirectoryList(displayPath, fileStats, pathname.endsWith('/') ? pathname : pathname + '/');
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(html);
            });
          } else {
            // 非 list 模式：尝试访问 index.html
            const indexPath = path.join(filePath, 'index.html');
            fs.readFile(indexPath, (err2, data2) => {
              if (err2) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data2);
              }
            });
          }
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Internal Server Error');
        }
        return;
      }
      
      // 获取 MIME 类型
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);

      // Markdown 文件特殊处理：预览模式 or 下载模式
      if (ext === '.md') {
        if (query.download === 'true') {
          // 下载模式：返回原始 Markdown 文件
          res.writeHead(200, {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
          });
          res.end(data);
        } else {
          // 预览模式：返回渲染后的 HTML 页面
          const html = buildMarkdownPage(data.toString('utf-8'), fileName);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        }
        return;
      }
      
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return server;
}

function startServer(rootDir, port, listMode = true) {
  const MAX_PORT = 65535;
  const MAX_RETRIES = 5;
  const originalPort = port;
  let retryCount = 0;
  const occupiedPorts = [];

  return new Promise((resolve, reject) => {
    function tryListen(currentPort) {
      const server = createServer(rootDir, listMode);
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          occupiedPorts.push(currentPort);
          retryCount++;
          
          if (retryCount > MAX_RETRIES || currentPort >= MAX_PORT) {
            reject(new Error(`以下端口均被占用: ${occupiedPorts.join(', ')}`));
            return;
          }
          
          server.close();
          const nextPort = currentPort + 1;
          console.log(`  端口 ${currentPort} 被占用，尝试使用端口 ${nextPort}...`);
          tryListen(nextPort);
        } else {
          reject(err);
        }
      });
      
      server.listen(currentPort, () => {
        const portInfo = retryCount > 0 ? ` (原始端口 ${originalPort} 被占用，已自动切换)` : '';
        console.log(`
  lite-http-preview 已启动${portInfo}
  
  根目录: ${rootDir}
  地址:   http://localhost:${currentPort}
        `);
        resolve({ server, port: currentPort });
      });
    }

    tryListen(port);
  });
}

module.exports = { startServer, createServer };
