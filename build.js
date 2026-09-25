#!/usr/bin/env node
/* Wraps src/page.html (the page fragment that the Claude artifact host publishes as-is)
   into a complete standalone index.html for GitHub Pages or plain local viewing.
   Usage: node build.js */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

function wrap(fragment) {
  let head = '';
  fragment = fragment.replace(/^\s*<title>[\s\S]*?<\/title>\s*/, m => { head += m.trim() + '\n'; return ''; });
  fragment = fragment.replace(/^\s*<link[^>]*>\s*/, m => { head += m.trim() + '\n'; return ''; });
  return '<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + head
    + '<style>body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
    + '</head>\n<body>\n' + fragment + '\n</body>\n</html>\n';
}

function build() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'page.html'), 'utf8');
  const out = wrap(src);
  fs.writeFileSync(path.join(ROOT, 'index.html'), out);
  console.log('index.html written, ' + out.length + ' bytes');
}

module.exports = { wrap, build };
if (require.main === module) build();
