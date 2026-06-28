
const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Путь к сертификатам, монтируемым через Docker Volume
const certPath = '/etc/letsencrypt/live/chat.web3cyberservices.xyz';

app.prepare().then(() => {
  // HTTP Сервер (Порт 3000 внутри контейнера -> 80 снаружи)
  createHttpServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log('> HTTP Server ready on port 3000 (Internal)');
  });

  // HTTPS Сервер (Порт 3001 внутри контейнера -> 443 снаружи)
  try {
    const options = {
      key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
      cert: fs.readFileSync(path.join(certPath, 'fullchain.pem')),
    };

    createHttpsServer(options, (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(3001, (err) => {
      if (err) throw err;
      console.log('> HTTPS Server ready on port 3001 (Internal)');
    });
  } catch (error) {
    console.error('⚠️  Failed to start HTTPS server. Certificates might be missing or inaccessible.');
    console.error(`Details: ${error.message}`);
    console.log('> Application is running in HTTP-only mode.');
  }
});
