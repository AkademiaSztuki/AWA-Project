const fs = require('fs');
const path = require('path');

function removeAgentLogs(dir) {
  let count = 0;
  
  function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    
    // Remove blocks from // #region agent log to // #endregion (multiline, including void fetch)
    newContent = newContent.replace(/\s*\/\/\s*#region\s+(agent\s+log|prompt\s+debug).*?\/\/\s*#endregion\s*/gs, '');
    
    // Remove single-line fetch calls to localhost:7242 (with or without void)
    newContent = newContent.replace(/.*(void\s+)?fetch\(['"]http:\/\/127\.0\.0\.1:7242.*?\)\.catch\(\(\)=>\{\}\);?\s*/gm, '');
    
    // Clean up multiple empty lines
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Cleaned: ${path.relative(process.cwd(), filePath)}`);
      count++;
    }
  }
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .next
        if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
          walkDir(filePath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        processFile(filePath);
      }
    }
  }
  
  walkDir(dir);
  console.log(`\nTotal files cleaned: ${count}`);
}

// Start from src directory
const srcDir = path.join(__dirname, '..', 'src');
console.log('Removing agent log blocks from:', srcDir);
removeAgentLogs(srcDir);
