#!/usr/bin/env node
/**
 * Fix DynamicScene.tsx double-curly-brace bug
 * Generated TSX has {{ hLines }} and {{ vLines }} which are React errors.
 * Must be {hLines} and {vLines} for JSX children.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const targetDir = args[0] || '.';

const dScene = path.join(targetDir, 'src/scenes/DynamicScene.tsx');

if (!fs.existsSync(dScene)) {
  console.error(`DynamicScene.tsx not found at ${dScene}`);
  process.exit(1);
}

let content = fs.readFileSync(dScene, 'utf8');
const original = content;

content = content.replace(/\{\{\s*hLines\s*\}\}/g, '{hLines}');
content = content.replace(/\{\{\s*vLines\s*\}\}/g, '{vLines}');

if (content === original) {
  console.log('No double-curly-brace bugs found, nothing to fix.');
} else {
  fs.writeFileSync(dScene, content);
  console.log('Fixed double-curly-brace bugs in DynamicScene.tsx');
  
  // Verify
  const hLinesDouble = (content.match(/\{\{\s*hLines\s*\}\}/g) || []).length;
  const vLinesDouble = (content.match(/\{\{\s*vLines\s*\}\}/g) || []).length;
  const hLinesSingle = (content.match(/{hLines}/g) || []).length;
  const vLinesSingle = (content.match(/{vLines}/g) || []).length;
  console.log(`  {{ hLines }} remaining: ${hLinesDouble} (should be 0)`);
  console.log(`  {{ vLines }} remaining: ${vLinesDouble} (should be 0)`);
  console.log(`  {hLines} found: ${hLinesSingle}`);
  console.log(`  {vLines} found: ${vLinesSingle}`);
}
