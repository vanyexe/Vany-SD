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
const files = walk('./src/app/api');
let changed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/\{ params \}: \{ params: \{ ([a-zA-Z0-9_]+): string \} \}/g, '{ params }: { params: Promise<{ $1: string }> }');
  
  if (content !== original) {
    content = content.replace(/const \{([^\}]+)\} = params/g, 'const {$1} = await params');
    content = content.replace(/params\.([a-zA-Z0-9_]+)/g, '(await params).$1');
    fs.writeFileSync(file, content, 'utf8');
    changed++;
  }
}
console.log('Fixed route params in files: ' + changed);
