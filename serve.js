/* Local preview: node serve.js, then open http://localhost:8765
   Serves src/page.html wrapped as a full document, and everything else as static files. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { wrap } = require('./build.js');
const ROOT = __dirname;
const PORT = 8766;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css', '.mp3': 'audio/mpeg'
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/index.html') {
    try {
      const body = wrap(fs.readFileSync(path.join(ROOT, 'src', 'page.html'), 'utf8'));
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      return res.end(body);
    } catch (e) { res.writeHead(500); return res.end(String(e)); }
  }
  const f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(PORT, () => console.log('Italiano in 30 giorni: http://localhost:' + PORT));
