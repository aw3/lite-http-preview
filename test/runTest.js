const fs = require('fs');
const path = require('path');

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

async function runAll() {
  for (const file of testFiles) {
    const { run } = require(path.join(testDir, file));
    await run();
  }
  console.log('所有测试通过');
}

runAll().catch(err => {
  console.error('测试失败:', err.message);
  process.exit(1);
});
