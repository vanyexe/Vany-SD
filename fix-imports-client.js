const fs = require('fs');

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
let fixedCount = 0;

for (const file of files) {
  if (file.includes('dateUtils.ts')) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Ensure import exists if getISTDateString is used
  if (content.includes('getISTDateString(') && !content.includes("import { getISTDateString }")) {
    content = "import { getISTDateString } from '@/lib/dateUtils';\n" + content;
    changed = true;
  }

  // Fix "use client" ordering
  const importStatement = "import { getISTDateString } from '@/lib/dateUtils';";
  
  if (content.includes(importStatement)) {
    const lines = content.split('\n');
    let useClientIndex = -1;
    let importIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("'use client'") || lines[i].includes('"use client"')) {
        useClientIndex = i;
      }
      if (lines[i].includes(importStatement)) {
        importIndex = i;
      }
    }

    if (useClientIndex > importIndex && importIndex !== -1) {
      // Remove import from current position
      lines.splice(importIndex, 1);
      // useClientIndex might have shifted if importIndex < useClientIndex, which is true
      // Insert after use client (which is now at useClientIndex - 1)
      lines.splice(useClientIndex, 0, importStatement);
      content = lines.join('\n');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    fixedCount++;
    console.log('Fixed', file);
  }
}
console.log('Fixed ' + fixedCount + ' files.');
