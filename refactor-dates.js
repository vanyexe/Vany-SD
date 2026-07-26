const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

for (const file of files) {
  if (file.includes('dateUtils.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  let hasChanges = false;
  
  // Replace new Date().toISOString().slice(0, 10)
  content = content.replace(/new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/g, 'getISTDateString()');
  // Replace new Date().toISOString().split('T')[0]
  content = content.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, 'getISTDateString()');
  // Replace new Date(something).toISOString().slice(0, 10)
  content = content.replace(/new Date\(([^)]+)\)\.toISOString\(\)\.slice\(0,\s*10\)/g, 'getISTDateString(new Date($1))');
  // Replace new Date(something).toISOString().split('T')[0]
  content = content.replace(/new Date\(([^)]+)\)\.toISOString\(\)\.split\('T'\)\[0\]/g, 'getISTDateString(new Date($1))');
  
  // Replace var.toISOString().slice(0, 10)
  content = content.replace(/([a-zA-Z0-9_]+)\.toISOString\(\)\.slice\(0,\s*10\)/g, 'getISTDateString($1)');
  // Replace var.toISOString().split('T')[0]
  content = content.replace(/([a-zA-Z0-9_]+)\.toISOString\(\)\.split\('T'\)\[0\]/g, 'getISTDateString($1)');
  
  if (content !== original) {
    // Inject import if not exists
    if (!content.includes('getISTDateString')) {
      const depth = file.split('/').length - 2; // ./src/app/api -> depth 2 -> @/lib/dateUtils
      const importStatement = `import { getISTDateString } from '@/lib/dateUtils';\n`;
      // Put it after the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfImport = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfImport + 1) + importStatement + content.slice(endOfImport + 1);
      } else {
        content = importStatement + '\n' + content;
      }
    }
    
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log('Updated', file);
  }
}
console.log('Fixed ' + changedCount + ' files.');
