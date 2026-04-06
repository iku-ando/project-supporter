const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/project-dashboard.html';
  const fp = path.join(dir, url);
  try {
    const data = fs.readFileSync(fp);
    const mime = MIME[path.extname(fp)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log('Server running on port ' + port);
});
