
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Simple HTTP server for Reverse Proxy (Nginx) compatibility in 2026
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, '127.0.0.1', (err) => {
    if (err) throw err;
    console.log('> Web3 Chat: HTTP Production Server ready on 127.0.0.1:3000');
  });
});
