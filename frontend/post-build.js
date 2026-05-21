const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const serverDir = path.join(__dirname, '.next', 'server');

if (fs.existsSync(serverDir)) {
  console.log('Replacing __dirname in compiled Edge/Server files...');
  walkDir(serverDir, filePath => {
    if (filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('__dirname')) {
        console.log(`- Updating: ${path.relative(serverDir, filePath)}`);
        // Replace __dirname with a safe fallback expression
        const updatedContent = content.replace(/\b__dirname\b/g, "(typeof __dirname !== 'undefined' ? __dirname : '/')");
        fs.writeFileSync(filePath, updatedContent, 'utf8');
      }
    }
  });
  console.log('__dirname replacement completed successfully!');
} else {
  console.warn('Warning: .next/server folder not found.');
}
