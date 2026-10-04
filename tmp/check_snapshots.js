const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('onSnapshot')) continue;
  
  const regex = /onSnapshot\s*\(/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const startIndex = match.index;
    let depth = 0;
    let endIndex = startIndex + match[0].length;
    let inString = false;
    let stringChar = '';
    for (let i = startIndex + match[0].length - 1; i < content.length; i++) {
      const c = content[i];
      if (inString) {
        if (c === stringChar && content[i-1] !== '\\') {
          inString = false;
        }
      } else {
        if (c === '"' || c === "'" || c === '`') {
          inString = true;
          stringChar = c;
        } else if (c === '(') {
          depth++;
        } else if (c === ')') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }
    const fullCall = content.substring(startIndex, endIndex + 1);
    const lineNum = content.substring(0, startIndex).split('\n').length;
    console.log(`FILE: ${file}:${lineNum}`);
    console.log(fullCall.replace(/\n\s+/g, ' '));
    console.log('-------------------------------------------');
  }
}
