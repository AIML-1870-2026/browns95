// build.js — injects OPENAI_API_KEY from .env into index.html at build time.
// The committed index.html uses the placeholder __OPENAI_API_KEY__ instead.
// Run: node build.js
// Output: index.html with the real key injected (do NOT commit this file).

require('dotenv').config();
const fs = require('fs');

const key = process.env.OPENAI_API_KEY || '';
if (!key || !key.startsWith('sk-')) {
  console.warn('⚠️  OPENAI_API_KEY not found or looks invalid in .env — injecting empty placeholder.');
}

const src  = fs.readFileSync('index.html', 'utf8');
const out  = src.replace('__OPENAI_API_KEY__', key);
fs.writeFileSync('index.html', out, 'utf8');

console.log(`✓ API key injected into index.html (${key ? key.slice(0,8) + '...' : 'empty'})`);
console.log('  Open index.html in your browser to use the app.');
console.log('  ⚠️  Do NOT commit index.html after running this — it contains your key.');
