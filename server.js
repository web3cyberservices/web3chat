
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Стандарт июля 2026: Слушаем 0.0.0.0 для доступности внутри Docker/K8s
  // Порт 3000 проксируется внешним Nginx
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log('> Web3 Chat: HTTP Production Server ready on 0.0.0.0:3000');
  });
});
