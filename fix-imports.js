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
  if (content.includes('getISTDateString(') && !content.includes("import { getISTDateString }")) {
    content = "import { getISTDateString } from '@/lib/dateUtils';\n" + content;
    fs.writeFileSync(file, content, 'utf8');
    fixedCount++;
    console.log('Fixed import in', file);
  }
}
console.log('Fixed ' + fixedCount + ' files.');
