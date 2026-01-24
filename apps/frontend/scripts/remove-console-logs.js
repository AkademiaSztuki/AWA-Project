const fs = require('fs');
const path = require('path');

function removeConsoleLogs(dir) {
  let count = 0;
  let removedCount = 0;
  
  function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    const lines = content.split('\n');
    const newLines = [];
    let removed = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip console.error and console.warn - keep those
      if (line.includes('console.error') || line.includes('console.warn')) {
        newLines.push(line);
        continue;
      }
      
      // Remove console.log lines (single line)
      if (line.trim().startsWith('console.log(') || 
          line.trim().match(/^\s*console\.log\(/)) {
        // Check if it's a multi-line statement
        let openParens = (line.match(/\(/g) || []).length;
        let closeParens = (line.match(/\)/g) || []).length;
        
        if (openParens > closeParens) {
          // Multi-line, skip until we find the closing
          let j = i + 1;
          while (j < lines.length && openParens > closeParens) {
            openParens += (lines[j].match(/\(/g) || []).length;
            closeParens += (lines[j].match(/\)/g) || []).length;
            j++;
          }
          i = j - 1; // Skip to after the closing
          removed++;
          continue;
        } else {
          // Single line console.log
          removed++;
          continue;
        }
      }
      
      newLines.push(line);
    }
    
    newContent = newLines.join('\n');
    
    // Clean up multiple empty lines
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Cleaned: ${path.relative(process.cwd(), filePath)} (removed ${removed} console.log)`);
      count++;
      removedCount += removed;
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
  console.log(`Total console.log removed: ${removedCount}`);
}

// Start from src directory
const srcDir = path.join(__dirname, '..', 'src');
console.log('Removing console.log from:', srcDir);
console.log('(Keeping console.error and console.warn)\n');
removeConsoleLogs(srcDir);
