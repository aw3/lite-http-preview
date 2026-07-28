const fs = require('fs');
const path = require('path');
const http = require('http');
const { createServer } = require('../server/index.js');

// 测试配置
const TEST_PORT = 18081;
const TEST_DIR = path.join(__dirname, 'test-download-fix');
const LARGE_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 创建测试目录和文件
function setup() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // 创建一个大文件用于测试
  const largeFilePath = path.join(TEST_DIR, 'large-test-file.bin');
  if (!fs.existsSync(largeFilePath)) {
    console.log(`正在创建 ${LARGE_FILE_SIZE / 1024 / 1024}MB 测试文件...`);
    const chunk = Buffer.alloc(1024 * 1024); // 1MB chunk
    for (let i = 0; i < LARGE_FILE_SIZE / chunk.length; i++) {
      fs.appendFileSync(largeFilePath, chunk);
    }
    console.log('测试文件创建完成');
  }
  
  // 创建一个小文件作为对照
  const smallFilePath = path.join(TEST_DIR, 'small-test-file.txt');
  if (!fs.existsSync(smallFilePath)) {
    fs.writeFileSync(smallFilePath, 'This is a small test file for comparison.');
  }
}

// 下载文件并返回状态码、大小和 Content-Length 响应头
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let downloadedSize = 0;
      res.on('data', (chunk) => {
        downloadedSize += chunk.length;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          size: downloadedSize,
          contentLength: res.headers['content-length']
        });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// 运行测试
async function runTest() {
  console.log('=== 大文件下载 500 错误修复验证 ===\n');
  
  setup();
  
  // 启动服务器
  const server = createServer(TEST_DIR, true);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`测试服务器已启动，端口: ${TEST_PORT}\n`);
  
  try {
    // 测试 1: 下载小文件（应该成功）
    console.log('测试 1: 下载小文件...');
    const smallResult = await downloadFile(`http://localhost:${TEST_PORT}/small-test-file.txt`);
    console.log(`  状态码: ${smallResult.statusCode}, 大小: ${smallResult.size} bytes, Content-Length: ${smallResult.contentLength}`);
    if (smallResult.statusCode !== 200) {
      throw new Error(`小文件下载失败，状态码: ${smallResult.statusCode}`);
    }
    if (smallResult.contentLength !== String(smallResult.size)) {
      throw new Error(`小文件 Content-Length 不正确，期望: ${smallResult.size}, 实际: ${smallResult.contentLength}`);
    }
    console.log('  ✅ 通过\n');
    
    // 测试 2: 下载大文件（这是关键测试，修复前会返回 500）
    console.log(`测试 2: 下载大文件 (${LARGE_FILE_SIZE / 1024 / 1024}MB)...`);
    const largeResult = await downloadFile(`http://localhost:${TEST_PORT}/large-test-file.bin`);
    console.log(`  状态码: ${largeResult.statusCode}, 大小: ${largeResult.size} bytes, Content-Length: ${largeResult.contentLength}`);
    
    if (largeResult.statusCode === 500) {
      throw new Error('❌ 大文件下载返回 500 错误！修复未生效或存在其他问题。');
    }
    if (largeResult.statusCode !== 200) {
      throw new Error(`大文件下载失败，状态码: ${largeResult.statusCode}`);
    }
    if (largeResult.size !== LARGE_FILE_SIZE) {
      throw new Error(`大文件下载不完整，期望: ${LARGE_FILE_SIZE}, 实际: ${largeResult.size}`);
    }
    if (largeResult.contentLength !== String(LARGE_FILE_SIZE)) {
      throw new Error(`大文件 Content-Length 不正确，期望: ${LARGE_FILE_SIZE}, 实际: ${largeResult.contentLength}`);
    }
    console.log('  ✅ 通过（流式传输正常，Content-Length 正确）\n');
    
    console.log('=== 所有测试通过 ===');
    console.log('结论: server/index.js 已正确实现大文件流式下载修复');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTest();
